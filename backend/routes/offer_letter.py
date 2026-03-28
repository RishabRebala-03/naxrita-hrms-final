import os
import re
import shutil
import zipfile
import tempfile
import subprocess
from datetime import datetime
from flask import Blueprint, jsonify, send_file
from bson import ObjectId
from config.db import get_db

offer_letter_bp = Blueprint("offer_letter", __name__)
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "offer_letter_template.docx")


def _patch_footer(xml: str) -> str:
    """Reduce footer font sizes from 22 (11pt) to 18 (9pt) so text fits without clipping."""
    # Reduce all sz val="22" inside footer textboxes to 18
    xml = xml.replace('w:sz w:val="22"', 'w:sz w:val="18"')
    # Also expand the left textbox height so it doesn't clip: cy="565785" → cy="620000"
    xml = xml.replace('cx="3143250" cy="565785"', 'cx="3143250" cy="650000"')
    # Move the left textbox up a bit so it doesn't get cut: posOffset 9846688 → 9780000
    xml = xml.replace(
        '<wp:posOffset>9846688</wp:posOffset>',
        '<wp:posOffset>9780000</wp:posOffset>'
    )
    # Move right textbox (contact) up too: 9971961 → 9790000
    xml = xml.replace(
        '<wp:posOffset>9971961</wp:posOffset>',
        '<wp:posOffset>9790000</wp:posOffset>'
    )
    return xml


def _generate_offer_letter(user_name: str, nax_unid: str) -> tuple:
    tmp_dir = tempfile.mkdtemp(prefix="offer_")
    tmp_docx = os.path.join(tmp_dir, "offer_output.docx")
    shutil.copy2(TEMPLATE_PATH, tmp_docx)

    extract_dir = os.path.join(tmp_dir, "extracted")
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(tmp_docx, "r") as z:
        z.extractall(extract_dir)

    # ── Patch document.xml ──────────────────────────────────────────────────
    doc_xml_path = os.path.join(extract_dir, "word", "document.xml")
    with open(doc_xml_path, "r", encoding="utf-8") as f:
        xml = f.read()

    # 1. Replace DevCon ID
    xml = xml.replace(">1500001<", f">{nax_unid}<")

    # 2. Replace date with current system date  e.g. 04-Mar-2026
    current_date = datetime.now().strftime("%d-%b-%Y")
    xml = xml.replace(">21-Jan-2026<", f">{current_date}<")

    # 3. Replace college name everywhere (trailing-space variant first)
    xml = xml.replace(">Sri Vasavi Engineering College <", ">MLR Institute of Technology <")
    xml = xml.replace(">Sri Vasavi Engineering College<", ">MLR Institute of Technology<")

    # 4. "Dear" line – replace name AND add comma after it
    #    Template runs:  ">Yerra<"  ">Lalitha,<"
    #    Result wanted:  "Dear Likhitha Sai Edupalli,"
    xml = xml.replace(">Yerra<", f">{user_name},<", 1)   # inject full name + comma
    xml = xml.replace(">Lalitha,<", "><", 1)              # blank out old last-name run

    # 5. Acceptance line – "I, Yerra Lalitha, confirm…"
    #    Replace name run with full name (no extra trailing space — the space run after is preserved)
    xml = xml.replace(">Yerra<", f">{user_name}<", 1)
    xml = xml.replace(">Lalitha,<", "><", 1)
    # The template has a spacing run ">  <" (double space) between name and "confirm";
    # fix it to single space by collapsing any double-space in that vicinity
    xml = re.sub(r'(<w:t[^>]*>)\s{2,}(confirm)', r'\1 \2', xml)

    # 6. Remove extra blank paragraph after "Dear" line (paraId 0D0B940D, w:before="185")
    xml = re.sub(
        r'<w:p w14:paraId="0D0B940D".*?</w:p>',
        '',
        xml,
        flags=re.DOTALL
    )

    # 7. Fix left strip gap: posOffset 21699 → 0
    xml = xml.replace(
        '<wp:posOffset>21699</wp:posOffset>',
        '<wp:posOffset>0</wp:posOffset>'
    )

    with open(doc_xml_path, "w", encoding="utf-8") as f:
        f.write(xml)

    # ── Patch footer1.xml ───────────────────────────────────────────────────
    footer_xml_path = os.path.join(extract_dir, "word", "footer1.xml")
    if os.path.exists(footer_xml_path):
        with open(footer_xml_path, "r", encoding="utf-8") as f:
            footer_xml = f.read()
        footer_xml = _patch_footer(footer_xml)
        with open(footer_xml_path, "w", encoding="utf-8") as f:
            f.write(footer_xml)

    # ── Repack DOCX ─────────────────────────────────────────────────────────
    docx_path = os.path.join(tmp_dir, "offer_final.docx")
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, extract_dir)
                zout.write(file_path, arcname)

    # ── Convert DOCX → PDF ──────────────────────────────────────────────────
    result = subprocess.run(
        [
            "/usr/bin/libreoffice", "--headless", "--convert-to", "pdf",
            "--outdir", tmp_dir,
            docx_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
        env={**os.environ, "HOME": tmp_dir},
    )

    pdf_path = os.path.join(tmp_dir, "offer_final.pdf")
    if result.returncode != 0 or not os.path.exists(pdf_path):
        raise RuntimeError(f"PDF conversion failed: {result.stderr}")

    return pdf_path, tmp_dir


@offer_letter_bp.route("/<user_id>", methods=["GET"])
def generate_offer_letter(user_id: str):
    db = get_db()
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = db.users.find_one({"userId": user_id})

    if not user:
        return jsonify({"error": "User not found"}), 404

    name = user.get("name", "Associate")
    nax_unid = user.get("naxUnid") or user.get("userId", "N/A")

    if not os.path.exists(TEMPLATE_PATH):
        return jsonify({"error": "Offer letter template not found on server"}), 500

    try:
        output_path, tmp_dir = _generate_offer_letter(name, nax_unid)
        safe_name = re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "_")
        download_name = f"{safe_name}_Devcon_Offer_Letter.pdf"

        response = send_file(
            output_path,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/pdf",
        )

        @response.call_on_close
        def cleanup():
            shutil.rmtree(tmp_dir, ignore_errors=True)

        return response
    except Exception as e:
        return jsonify({"error": f"Failed to generate offer letter: {str(e)}"}), 500