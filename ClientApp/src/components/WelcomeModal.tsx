import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDemo: () => void;
  onUpload: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onLoadDemo,
  onUpload,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="modal" 
      className={`modal ${isOpen ? 'show' : ''}`}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Welcome to ReplayRun.com!</h5>
          </div>
          <div className="modal-body">
            Upload GPX files of your activities.
            Replay how a race transpired. Compare your race to previous years.
            Review how your overall pace changed during the race. <br />
            Enjoy!
          </div>
          <div className="modal-footer">
            <button 
              id="close-modal" 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button 
              id="load-boston-demo" 
              type="button" 
              className="btn btn-primary"
              onClick={onLoadDemo}
            >
              See Boston Demo
            </button>
            <button 
              id="upload-gpx-from-modal" 
              type="button" 
              className="btn btn-primary"
              onClick={onUpload}
            >
              Upload your GPX File...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
