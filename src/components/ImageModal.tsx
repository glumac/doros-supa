import { useState, useEffect, useRef } from 'react';
import { getFullSizeImageUrl } from '../lib/storage';
import { useModal } from '../hooks/useModal';

interface ImageModalProps {
  isOpen: boolean;
  imagePath: string;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

const ImageModal = ({ isOpen, imagePath, onClose, triggerRef }: ImageModalProps) => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Use shared modal hook for focus, escape, scroll lock, and overlay click
  const { handleOverlayClick } = useModal(isOpen, onClose, closeButtonRef, triggerRef);

  // Fetch full-size image URL
  useEffect(() => {
    if (!isOpen || !imagePath) {
      setImageURL(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const fetchImageUrl = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const url = await getFullSizeImageUrl(imagePath);
        if (url) {
          setImageURL(url);
          setHasError(false);
        } else {
          setHasError(true);
          setImageURL(null);
        }
      } catch (error) {
        console.error('Error loading full-size image:', error);
        setHasError(true);
        setImageURL(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [isOpen, imagePath]);

  // Handle close button click
  const handleClose = () => {
    onClose();
    // Focus will be returned by useModal hook
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="cq-image-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="cq-image-modal-container"
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="cq-image-modal-close-button"
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            fontSize: '28px',
            cursor: 'pointer',
            color: '#666',
            padding: '0',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = '#666';
          }}
        >
          ×
        </button>

        {/* Image container */}
        <div
          className="cq-image-modal-image-container"
          style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {isLoading && (
            <div
              className="cq-image-modal-loading"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <p className="cq-image-modal-loading-text" style={{ color: '#666', fontSize: '18px' }}>
                Loading image...
              </p>
            </div>
          )}

          {hasError && (
            <div
              className="cq-image-modal-error"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <p className="cq-image-modal-error-text" style={{ color: '#666', fontSize: '18px' }}>
                Failed to load image
              </p>
            </div>
          )}

          {!isLoading && !hasError && imageURL && (
            <img
              src={imageURL}
              alt="Full size image"
              className="cq-image-modal-image"
              style={{
                maxWidth: 'calc(100vw - 40px)',
                maxHeight: 'calc(100vh - 40px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              onError={() => {
                setHasError(true);
                setImageURL(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;

