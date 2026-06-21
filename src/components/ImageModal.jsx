import { useEffect } from "react";

function ImageModal({ open, image, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !image?.src) {
    return null;
  }

  return (
    <div className="image-modal" role="dialog" aria-modal="true" aria-label={image.title || "Image preview"}>
      <button className="image-modal__backdrop" type="button" aria-label="Close image preview" onClick={onClose} />

      <div className="image-modal__panel">
        <header className="image-modal__header">
          <div className="image-modal__meta">
            <p className="image-modal__eyebrow">Image preview</p>
            <h3>{image.title || "Image"}</h3>
            {image.senderName ? <p className="image-modal__sender">{image.senderName}</p> : null}
          </div>

          <button className="image-modal__close" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="image-modal__body">
          <img className="image-modal__image" src={image.src} alt={image.alt || "Image preview"} />
        </div>
      </div>
    </div>
  );
}

export default ImageModal;
