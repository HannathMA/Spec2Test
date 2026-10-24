import io
from pathlib import Path
from typing import Tuple

def extract_text_from_file(filename: str, content: bytes) -> Tuple[str, str]:
    """
    Safely extracts text from uploaded requirement documents (.pdf, .docx, .txt, .md).
    Returns (extracted_text, document_type).
    Raises ValueError on unsupported or corrupted files.
    """
    suffix = Path(filename).suffix.lower()

    if suffix in [".txt", ".md"]:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content.decode("latin-1")
            except Exception as e:
                raise ValueError(f"Failed to decode text file: {e}")
        return text.strip(), suffix[1:]

    elif suffix == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            pages_text = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(extracted)
            full_text = "\n\n".join(pages_text).strip()
            if not full_text:
                raise ValueError("PDF document does not contain extractable text (it may be a scanned image).")
            return full_text, "pdf"
        except Exception as e:
            raise ValueError(f"Could not extract text from PDF: {str(e)}")

    elif suffix == ".docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs).strip()
            if not full_text:
                raise ValueError("DOCX document is empty.")
            return full_text, "docx"
        except Exception as e:
            raise ValueError(f"Could not extract text from DOCX: {str(e)}")

    else:
        raise ValueError(f"Unsupported file format '{suffix}'. Please upload .pdf, .docx, .txt, or .md files.")
