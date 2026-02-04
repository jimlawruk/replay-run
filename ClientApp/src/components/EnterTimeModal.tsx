import React, { useState, useEffect, useRef } from 'react';

interface EnterTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hours: number, minutes: number, seconds: number) => void;
}

export const EnterTimeModal: React.FC<EnterTimeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const hoursRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      // Focus hours input when modal opens
      setTimeout(() => hoursRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit(hours, minutes, seconds);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="modal-enter-time" 
      className={`modal ${isOpen ? 'show' : ''}`}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">GPX without timestamps</h5>
          </div>
          <div className="modal-body">
            <div className="text">
              This GPX file does not have timestamps. Enter the time elapsed.
            </div>
            <div className="enter-time-input-container">
              Hours: 
              <input 
                ref={hoursRef}
                id="hours" 
                type="number" 
                min="0" 
                max="100"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
              />
              Minutes: 
              <input 
                id="minutes" 
                type="number" 
                min="0" 
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              />
              Seconds: 
              <input 
                id="seconds" 
                type="number" 
                min="0" 
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button 
              id="close-modal-enter-time" 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              id="process-entered-time-button" 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              Continue...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
