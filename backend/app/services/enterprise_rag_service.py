"""
enterprise_rag_service.py — LifeLink Enterprise RAG (Retrieval Augmented Generation)
==================================================================================
Handles:
- Chunking hospital documents and policies into embeddable pieces
- Embedding chunks via sentence-transformers → FAISS vector index
- Persisting chunk metadata in lifelink_ai_embeddings table
- Retrieving relevant chunks before every AI response with role/module filters
- Ingestion pipeline for hospital policies, medical knowledge, and documents
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import numpy as np
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.lifelink_ai_models import LifeLinkAIEmbedding

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# EMBEDDING HELPERS
# ═══════════════════════════════════════════════════════════════════

_EMBEDDING_MODEL: Any = None  # Lazy-loaded singleton SentenceTransformer
_EMBEDDING_LOCK: Any = None


def _ensure_model():
    """Lazy-load the SentenceTransformer model in a background thread.

    The load can take seconds (or longer on a cold cache) and must never run
    synchronously on the event loop — that would freeze every request until
    the model finishes downloading/parsing. Requests that arrive before the
    model is ready transparently fall back to keyword search.
    """
    global _EMBEDDING_MODEL, _EMBEDDING_LOCK
    if _EMBEDDING_MODEL not in (None, "loading"):
        return
    if _EMBEDDING_LOCK is None:
        import threading
        _EMBEDDING_LOCK = threading.Lock()
    if not _EMBEDDING_LOCK.acquire(blocking=False):
        return  # another thread is already loading — keyword fallback this time

    _EMBEDDING_MODEL = "loading"

    def _load():
        global _EMBEDDING_MODEL
        try:
            from sentence_transformers import SentenceTransformer
            from app.core.config import get_settings
            settings = get_settings()
            _EMBEDDING_MODEL = SentenceTransformer(settings.embedding_model)
            logger.info(
                "Embedding model loaded: %s (dim=%d)",
                settings.embedding_model,
                _EMBEDDING_MODEL.get_sentence_embedding_dimension(),
            )
        except ImportError:
            logger.warning("sentence-transformers not installed — RAG will use keyword fallback")
            _EMBEDDING_MODEL = False
        except Exception as exc:
            logger.warning("Embedding model load failed — RAG uses keyword fallback: %s", exc)
            _EMBEDDING_MODEL = False
        finally:
            _EMBEDDING_LOCK.release()

    import threading
    threading.Thread(target=_load, daemon=True).start()


def _embed(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts into vectors using the loaded model.

    If the model is still loading (or unavailable), returns empty vectors so
    callers fall back to keyword search instead of blocking.
    """
    _ensure_model()
    if not _EMBEDDING_MODEL or _EMBEDDING_MODEL == "loading":
        return [[] for _ in texts]
    embeddings = _EMBEDDING_MODEL.encode(texts, normalize_embeddings=True)
    return [emb.tolist() for emb in embeddings]


def _build_faiss_index(vectors: list[list[float]]) -> Any | None:
    """
    Build a FAISS index from a list of vectors.
    The index positions correspond 1:1 with the input list order.
    Returns None if FAISS is not available.
    """
    if not vectors or not vectors[0]:
        return None
    try:
        import faiss
        arr = np.array(vectors, dtype="float32")
        dim = arr.shape[1]
        ix = faiss.IndexFlatIP(dim)
        ix.add(arr)
        return ix
    except ImportError:
        logger.debug("faiss-cpu not installed — cannot build vector index")
        return None


def _faiss_search(faiss_index: Any, query_vector: list[float], top_k: int) -> list[tuple[int, float]]:
    """
    Search a FAISS index. The index positions correspond to the order
    vectors were provided when the index was built.
    """
    if faiss_index is None or faiss_index.ntotal == 0:
        return []
    query_np = np.array([query_vector], dtype="float32")
    actual_k = min(top_k, faiss_index.ntotal)
    distances, indices = faiss_index.search(query_np, actual_k)
    return list(zip(indices[0], distances[0]))


# ═══════════════════════════════════════════════════════════════════
# CHUNKER
# ═══════════════════════════════════════════════════════════════════

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split a long document into overlapping chunks."""
    if not text.strip():
        return []
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


# ═══════════════════════════════════════════════════════════════════
# KEYWORD FALLBACK SEARCH
# ═══════════════════════════════════════════════════════════════════


def _keyword_search(
    query: str,
    chunks: list[dict[str, Any]],
    top_k: int,
) -> list[dict[str, Any]]:
    """Simple keyword-based fallback when FAISS is not available."""
    query_tokens = set(query.lower().split())
    scored = []
    for chunk in chunks:
        text = (chunk.get("chunk_text") or "").lower()
        tokens = set(text.split())
        overlap = len(query_tokens & tokens)
        if overlap > 0:
            scored.append((overlap, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, chunk in scored[:top_k]:
        results.append({
            "content": chunk["chunk_text"],
            "score": round(score / max(len(query_tokens), 1), 3),
            "source": chunk.get("source_document", ""),
            "title": chunk.get("source_title", ""),
            "content_type": chunk.get("content_type", "general"),
            "module": chunk.get("module", "general"),
        })
    return results


# ═══════════════════════════════════════════════════════════════════
# KNOWLEDGE DOCUMENTS (built-in sources for ingestion)
# ═══════════════════════════════════════════════════════════════════

_HOSPITAL_POLICIES = [
    {
        "title": "Patient Data Privacy Policy",
        "source": "hospital_policies",
        "content_type": "policy",
        "module": "general",
        "roles": ["hospital_ceo", "system_administrator", "it_technician", "nurse", "emergency_physician", "icu_physician", "radiologist", "lab_technician", "pharmacist", "finance_officer"],
        "text": (
            "Patient Data Privacy Policy — LifeLink Hospital\n"
            "All patient health information (PHI) is protected under applicable data protection laws. "
            "Access to PHI is granted only on a need-to-know basis and is determined by the user's role, "
            "department assignment, and current clinical responsibilities. "
            "All access is logged immutably in the audit trail. PHI is encrypted at rest (AES-256) and "
            "in transit (TLS 1.3). Any breach or unauthorized access must be reported immediately to the "
            "System Administrator. Employees who violate this policy may face disciplinary action up to "
            "and including termination and legal proceedings. Patient consent is required before sharing "
            "PHI with external entities unless required by law. Data retention follows a 7-year archive "
            "policy after which records are anonymized for research purposes."
        ),
    },
    {
        "title": "Role-Based Access Control (RBAC) Policy",
        "source": "hospital_policies",
        "content_type": "policy",
        "module": "general",
        "roles": ["hospital_ceo", "system_administrator", "it_technician"],
        "text": (
            "Role-Based Access Control Policy — LifeLink Hospital\n"
            "Access to all hospital systems and data is governed by RBAC. Each employee is assigned "
            "one or more roles, each with a defined set of permissions. Permissions are granular — "
            "'view', 'edit', 'create', 'delete', 'approve', 'export' — and scoped to specific modules. "
            "No user may access functionality or data beyond their assigned role permissions. "
            "Role assignments are managed by the System Administrator. Privilege escalation requires "
            "two-factor approval. All RBAC changes are logged in the enterprise audit trail. "
            "Quarterly access reviews are mandatory for all departments. Emergency override is available "
            "during declared mass casualty events but creates an immediate audit notification."
        ),
    },
    {
        "title": "Emergency Response Protocol",
        "source": "hospital_policies",
        "content_type": "policy",
        "module": "emergency",
        "roles": ["hospital_ceo", "emergency_physician", "icu_physician", "nurse", "system_administrator"],
        "text": (
            "Emergency Response Protocol — LifeLink Hospital\n"
            "Upon declaration of a mass casualty incident (MCI), the Emergency Department activates "
            "the Hospital Incident Command System (HICS). All non-critical elective procedures are "
            "paused. ICU surge capacity is activated, converting step-down units to ICU beds. "
            "The blood bank reserves a minimum of 20 units of O-negative blood. Ambulance diversion "
            "is coordinated with the regional emergency operations centre. All staff are notified via "
            "the emergency broadcast system. The CEO is notified within 5 minutes of MCI declaration. "
            "LifeLink AI enters emergency mode, prioritizing triage support, resource tracking, and "
            "real-time bed availability. Post-incident debrief is conducted within 24 hours."
        ),
    },
    {
        "title": "Medication Administration Guidelines",
        "source": "hospital_policies",
        "content_type": "clinical_guide",
        "module": "pharmacy",
        "roles": ["pharmacist", "nurse", "emergency_physician", "icu_physician"],
        "text": (
            "Medication Administration Guidelines — LifeLink Hospital\n"
            "All medications must be verified against the patient's record before administration. "
            "The 'Five Rights' protocol must be followed: Right patient, Right medication, "
            "Right dose, Right route, Right time. High-alert medications (insulin, opioids, "
            "anticoagulants, chemotherapy agents) require independent double-check by two qualified "
            "professionals. Medication reconciliation is performed at every transition of care. "
            "Adverse drug reactions must be reported within 1 hour. Controlled substances are "
            "tracked in the automated dispensing cabinet with biometric access. Expired medications "
            "are quarantined and disposed of per environmental guidelines. LifeLink AI can check "
            "for drug-drug interactions upon request."
        ),
    },
    {
        "title": "Blood Transfusion Protocol",
        "source": "hospital_policies",
        "content_type": "clinical_guide",
        "module": "blood_bank",
        "roles": ["lab_technician", "nurse", "emergency_physician", "icu_physician"],
        "text": (
            "Blood Transfusion Protocol — LifeLink Hospital\n"
            "All blood transfusions require a valid patient ID, blood group verification, "
            "and cross-match confirmation. Emergency release of O-negative blood is authorized "
            "by the Emergency Physician for life-threatening haemorrhage. The blood bank maintains "
            "a minimum inventory of 50 units of whole blood and 20 units of O-negative. "
            "All transfusion reactions must be reported immediately. Blood products are tracked "
            "from donation to transfusion via the hospital information system. Expired blood "
            "products are discarded following biomedical waste protocols. Platelets have a 5-day "
            "shelf life and must be kept at 20-24°C with continuous agitation."
        ),
    },
    {
        "title": "ICU Admission and Discharge Criteria",
        "source": "hospital_policies",
        "content_type": "clinical_guide",
        "module": "icu",
        "roles": ["icu_physician", "nurse", "emergency_physician"],
        "text": (
            "ICU Admission and Discharge Criteria — LifeLink Hospital\n"
            "Patients are admitted to the ICU if they require invasive monitoring, mechanical ventilation, "
            "vasopressor support, or close observation for potentially life-threatening conditions. "
            "Discharge criteria include haemodynamic stability without vasopressors, spontaneous breathing "
            "trial success, absence of significant arrhythmias, and no active seizures. The ICU has 20 beds "
            "with surge capacity for an additional 10 beds during emergencies. Nurse-to-patient ratio is "
            "maintained at 1:2 for ventilated patients and 1:3 for non-ventilated patients. Daily "
            "multidisciplinary rounds include intensivist, nurse, pharmacist, and nutritionist."
        ),
    },
    {
        "title": "Revenue Cycle Management Policy",
        "source": "hospital_policies",
        "content_type": "policy",
        "module": "finance",
        "roles": ["finance_officer", "hospital_ceo"],
        "text": (
            "Revenue Cycle Management Policy — LifeLink Hospital\n"
            "All patient billing follows the standard chargemaster rates approved by the finance department. "
            "Insurance claims are submitted within 24 hours of service delivery. Denied claims are "
            "appealed within 15 business days. Cash and UPI payments are reconciled daily. Outstanding "
            "invoices older than 90 days are escalated to the Finance Officer for collection action. "
            "Write-offs beyond ₹50,000 require CEO approval. Monthly revenue reports are generated "
            "by the 5th of the following month. AI-driven revenue forecasting is available via the "
            "LifeLink AI Finance assistant. All financial transactions are audited quarterly."
        ),
    },
    {
        "title": "Hospital Visitor Policy",
        "source": "hospital_policies",
        "content_type": "policy",
        "module": "general",
        "roles": ["hospital_ceo", "system_administrator", "nurse", "emergency_physician"],
        "text": (
            "Hospital Visitor Policy — LifeLink Hospital\n"
            "Visiting hours are 10:00 AM to 8:00 PM. ICU visitors are limited to 15 minutes per hour, "
            "two visitors per patient. Emergency Department visitors must wait in the designated waiting "
            "area and are called when the patient is stable. Children under 12 are not permitted in ICU "
            "or Emergency areas. All visitors must sanitize hands upon entry and exit. During infectious "
            "disease outbreaks, visitor restrictions may be imposed at the discretion of the Infection "
            "Control Officer. Security personnel monitor all entry points 24/7."
        ),
    },
]

_MEDICAL_KNOWLEDGE_SOURCES = [
    {
        "title": "Vital Signs Reference Ranges",
        "source": "medical_knowledge",
        "content_type": "medical_knowledge",
        "module": "clinical",
        "roles": ["emergency_physician", "icu_physician", "nurse", "radiologist", "lab_technician"],
        "text": (
            "Vital Signs Reference Ranges — LifeLink Medical Knowledge Base\n"
            "Adult normal ranges: Heart Rate 60-100 bpm (critical <40 or >130). "
            "Blood Pressure: Systolic 90-130 mmHg (critical <70 or >200), Diastolic 60-85 mmHg (critical <40 or >120). "
            "Oxygen Saturation (SpO2): 95-100% (below 90% is critical). "
            "Respiratory Rate: 12-20 breaths/min (critical <8 or >28). "
            "Body Temperature: 36.1-37.5°C / 97.0-99.5°F (fever ≥38°C / 100.4°F). "
            "BMI: 18.5-24.9 kg/m² (critical <14 or >40). "
            "Age-adjusted considerations: Elderly patients (>65) may have lower normal heart rates. "
            "Athletes may have resting heart rates of 40-60 bpm which is normal for them."
        ),
    },
    {
        "title": "Blood Group Compatibility",
        "source": "medical_knowledge",
        "content_type": "medical_knowledge",
        "module": "blood_bank",
        "roles": ["lab_technician", "emergency_physician", "icu_physician", "nurse"],
        "text": (
            "Blood Group Compatibility — LifeLink Medical Knowledge Base\n"
            "Universal donor: O- (can donate to all blood types). "
            "Universal recipient: AB+ (can receive from all blood types). "
            "O- donors: Can donate to O-, O+, A-, A+, B-, B+, AB-, AB+. "
            "O+ donors: Can donate to O+, A+, B+, AB+. "
            "A- donors: Can donate to A-, A+, AB-, AB+. "
            "A+ donors: Can donate to A+, AB+. "
            "B- donors: Can donate to B-, B+, AB-, AB+. "
            "B+ donors: Can donate to B+, AB+. "
            "AB- donors: Can donate to AB-, AB+. "
            "AB+ donors: Can donate to AB+ only. "
            "Plasma compatibility follows the reverse pattern."
        ),
    },
    {
        "title": "Emergency Triage Classification",
        "source": "medical_knowledge",
        "content_type": "medical_knowledge",
        "module": "emergency",
        "roles": ["emergency_physician", "nurse", "icu_physician"],
        "text": (
            "Emergency Triage Classification — LifeLink Medical Knowledge Base\n"
            "Critical (Red): Unconscious, not breathing, cardiac arrest, severe bleeding, anaphylaxis, "
            "stroke symptoms, major trauma. Requires immediate life-saving intervention. "
            "High (Orange): Chest pain, difficulty breathing, severe pain, heavy bleeding, burns, "
            "open fractures, diabetic emergencies, suspected stroke. Requires evaluation within 10 minutes. "
            "Medium (Yellow): Fever, moderate pain, vomiting, diarrhea, mild bleeding, sprains, "
            "cuts, headache, abdominal pain. Requires evaluation within 30-60 minutes. "
            "Low (Green): Minor complaints, cold symptoms, minor injuries, follow-up visits. "
            "Can wait 60+ minutes. Triage re-assessment every 30 minutes for waiting patients."
        ),
    },
    {
        "title": "Hospital Departments and Services",
        "source": "hospital_information",
        "content_type": "hospital_info",
        "module": "general",
        "roles": ["*"],
        "text": (
            "LifeLink Hospital Departments and Services\n"
            "The hospital has 12 departments: CEO Office (5th Floor), Emergency Department (Ground Floor), "
            "ICU (2nd Floor), OPD (1st Floor), Radiology (3rd Floor), Finance (4th Floor), "
            "OT (2nd Floor), Laboratory (3rd Floor), Pharmacy (Ground Floor), "
            "Blood Bank (Ground Floor), System Administration (5th Floor). "
            "Total bed capacity: 500 beds across all departments. The hospital operates 24/7 with "
            "three shifts: Morning (6AM-2PM), Evening (2PM-10PM), Night (10PM-6AM). "
            "LifeLink AI is available 24/7 for role-specific assistance."
        ),
    },
]


# ═══════════════════════════════════════════════════════════════════
# ENTERPRISE RAG SERVICE
# ═══════════════════════════════════════════════════════════════════


class EnterpriseRAGService:
    """
    Enterprise RAG Service — ingestion, embedding, and retrieval for LifeLink AI.
    All queries are isolated by hospital_id and optionally role_id / module.
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    # ── INGESTION ─────────────────────────────────────────────────

    async def ingest_default_sources(self, hospital_id: str) -> dict[str, Any]:
        """
        Ingest the built-in hospital policies and medical knowledge into the
        lifelink_ai_embeddings table and the FAISS index.
        This is idempotent — duplicate entries by source_title are skipped.
        """
        all_sources = _HOSPITAL_POLICIES + _MEDICAL_KNOWLEDGE_SOURCES
        ingested = 0
        skipped = 0

        for source in all_sources:
            # Check if this source already exists for this hospital
            exists = await self._source_exists(hospital_id, source["title"], source["source"])
            if exists:
                skipped += 1
                continue

            # Chunk the source text
            chunks = chunk_text(source["text"])
            vectors = _embed(chunks)

            # Store each chunk in DB + FAISS
            db_chunks = []
            for idx, (chunk_text_content, vector) in enumerate(zip(chunks, vectors)):
                db_chunk = LifeLinkAIEmbedding(
                    id=uuid.uuid4().hex[:32],
                    hospital_id=hospital_id,
                    user_id=None,
                    role_id=None,
                    module=source["module"],
                    chunk_text=chunk_text_content,
                    chunk_index=idx,
                    source_document=source["source"],
                    source_title=source["title"],
                    content_type=source["content_type"],
                    embedding_vector=vector,
                    tags=[source["content_type"], source["source"], source["module"]],
                    roles=source["roles"],
                    accessible_modules=[source["module"]],
                )
                db_chunks.append(db_chunk)

            # Batch insert
            async with self._session_factory() as db:
                db.add_all(db_chunks)
                await db.commit()

            ingested += 1

        return {
            "ingested": ingested,
            "skipped": skipped,
            "total": len(all_sources),
        }

    async def ingest_custom_document(
        self,
        hospital_id: str,
        title: str,
        content: str,
        source: str = "custom",
        content_type: str = "general",
        module: str = "general",
        roles: list[str] | None = None,
    ) -> dict[str, Any]:
        """Ingest a single custom document into the RAG index."""
        chunks = chunk_text(content)
        vectors = _embed(chunks)

        db_chunks = []
        for idx, (chunk_text_content, vector) in enumerate(zip(chunks, vectors)):
            db_chunk = LifeLinkAIEmbedding(
                id=uuid.uuid4().hex[:32],
                hospital_id=hospital_id,
                user_id=None,
                role_id=None,
                module=module,
                chunk_text=chunk_text_content,
                chunk_index=idx,
                source_document=source,
                source_title=title,
                content_type=content_type,
                embedding_vector=vector,
                tags=[content_type, source, module],
                roles=roles or ["*"],
                accessible_modules=[module],
            )
            db_chunks.append(db_chunk)

        async with self._session_factory() as db:
            db.add_all(db_chunks)
            await db.commit()

        return {
            "ingested": 1,
            "chunks": len(chunks),
            "source": source,
            "title": title,
        }

    # ── RETRIEVAL ────────────────────────────────────────────────

    async def retrieve(
        self,
        query: str,
        hospital_id: str | None = None,
        role_id: str | None = None,
        module: str | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Retrieve the most relevant knowledge chunks for a given query.
        Applies hospital_id, role_id, and module filters.

        IMPORTANT: The FAISS index is built dynamically at retrieval time
        from the DB query results. This ensures positions always match
        the eligible chunks list — no position-mapping bugs.
        """
        _ensure_model()

        # 1. Load all eligible chunks from DB (filtered)
        eligible = await self._load_eligible_chunks(hospital_id, role_id, module)

        if not eligible:
            return []

        # 2. Build FAISS index from eligible chunks' embedding vectors
        #    Positions correspond 1:1 with the eligible list order
        vectors = [e["embedding_vector"] for e in eligible if e.get("embedding_vector")]
        if vectors and vectors[0]:
            faiss_index = _build_faiss_index(vectors)
        else:
            faiss_index = None

        query_vector = _embed([query])[0] if query else []
        results = []

        if query_vector and faiss_index is not None:
            # Vector search — positions match eligible list order
            faiss_results = _faiss_search(faiss_index, query_vector, top_k * 2)
            for idx, score in faiss_results:
                if idx < len(eligible):
                    chunk = eligible[idx]
                    results.append({
                        "content": chunk["chunk_text"],
                        "score": round(float(score), 3),
                        "source": chunk.get("source_document", ""),
                        "title": chunk.get("source_title", ""),
                        "content_type": chunk.get("content_type", "general"),
                        "module": chunk.get("module", "general"),
                    })
        else:
            # Fallback: keyword search when FAISS unavailable or no vectors
            results = _keyword_search(query, eligible, top_k)

        # 3. Sort by score, deduplicate by title, take top_k
        seen_titles = set()
        deduped = []
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        for r in results:
            title = r.get("title", "")
            if title not in seen_titles or not title:
                seen_titles.add(title)
                deduped.append(r)
            if len(deduped) >= top_k:
                break

        return deduped

    async def _load_eligible_chunks(
        self,
        hospital_id: str | None = None,
        role_id: str | None = None,
        module: str | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """Load eligible chunks from the database with role/module filtering."""
        async with self._session_factory() as db:
            stmt = select(LifeLinkAIEmbedding)

            if hospital_id:
                stmt = stmt.where(LifeLinkAIEmbedding.hospital_id == hospital_id)

            stmt = stmt.order_by(LifeLinkAIEmbedding.created_at.desc()).limit(limit)
            records = (await db.execute(stmt)).scalars().all()

        # Apply role and module filters in Python (since roles is a JSON list)
        eligible = []
        for r in records:
            r_roles = r.roles or ["*"]
            r_modules = r.accessible_modules or ["*"]

            # Role filter: chunk is eligible if its roles include "*" or the user's role
            if role_id and "*" not in r_roles and role_id not in r_roles:
                continue

            # Module filter
            if module and "*" not in r_modules and module not in r_modules:
                continue

            eligible.append({
                "id": r.id,
                "chunk_text": r.chunk_text,
                "source_document": r.source_document,
                "source_title": r.source_title,
                "content_type": r.content_type,
                "module": r.module,
                "roles": r.roles,
                "accessible_modules": r.accessible_modules,
                "embedding_vector": r.embedding_vector,
            })

            if len(eligible) >= limit:
                break

        return eligible

    async def _source_exists(self, hospital_id: str, title: str, source: str) -> bool:
        """Check if a source document already exists in the index."""
        async with self._session_factory() as db:
            stmt = (
                select(LifeLinkAIEmbedding.id)
                .where(LifeLinkAIEmbedding.hospital_id == hospital_id)
                .where(LifeLinkAIEmbedding.source_title == title)
                .where(LifeLinkAIEmbedding.source_document == source)
                .limit(1)
            )
            result = (await db.execute(stmt)).scalar_one_or_none()
            return result is not None

    # ── INDEX MANAGEMENT ─────────────────────────────────────────

    async def get_index_stats(self, hospital_id: str | None = None) -> dict[str, Any]:
        """Get statistics about the RAG index."""
        async with self._session_factory() as db:
            stmt = select(LifeLinkAIEmbedding)
            if hospital_id:
                stmt = stmt.where(LifeLinkAIEmbedding.hospital_id == hospital_id)
            records = (await db.execute(stmt)).scalars().all()

        total_chunks = len(records)
        sources = set()
        content_types = {}
        modules = {}
        for r in records:
            sources.add(r.source_document)
            ct = r.content_type
            content_types[ct] = content_types.get(ct, 0) + 1
            mod = r.module
            modules[mod] = modules.get(mod, 0) + 1

        return {
            "total_chunks": total_chunks,
            "total_sources": len(sources),
            "sources": sorted(sources),
            "content_types": content_types,
            "modules": modules,
        }

    async def reset_index(self, hospital_id: str | None = None) -> int:
        """Reset (delete) all embeddings — for a specific hospital or globally."""
        async with self._session_factory() as db:
            stmt = sa_delete(LifeLinkAIEmbedding)
            if hospital_id:
                stmt = stmt.where(LifeLinkAIEmbedding.hospital_id == hospital_id)
            result = await db.execute(stmt)
            await db.commit()
            deleted = result.rowcount

        # FAISS index is built dynamically from DB — no global state to reset
        return deleted
