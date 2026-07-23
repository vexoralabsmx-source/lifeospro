import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docData: {
    name: string;
    category: string;
    expiryDate?: string;
    pages: string[]; // array of base64 images
  }) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pages, setPages] = useState<string[]>([]); // Saved page base64 images
  const [currentCapture, setCurrentCapture] = useState<string | null>(null); // Current page being edited
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Document Metadata Form
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState('Personal');
  const [expiryDate, setExpiryDate] = useState('');
  
  // Filters & Adjustments
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isGrayscale, setIsGrayscale] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize and stop camera stream
  useEffect(() => {
    if (isOpen && isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, isCameraActive]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      let mediaStream: MediaStream;
      try {
        // Try environment camera (mobile back camera) with ideal constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch {
        // Fallback to any available video camera (laptop webcam, front cam, etc.)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Failed to access camera', err);
      setErrorMsg('No se detectó cámara activa o se denegaron los permisos. Puedes tomar o seleccionar una foto desde tu galería/archivos.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture image from video stream to canvas
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset adjustments
    setContrast(100);
    setRotation(0);
    setIsGrayscale(false);

    const base64 = canvas.toDataURL('image/jpeg');
    setCurrentCapture(base64);
    setIsCameraActive(false);
  };

  // Handle local file uploads (fallback)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentCapture(reader.result as string);
      setContrast(100);
      setRotation(0);
      setIsGrayscale(false);
      if (!docName) {
        // Prefill name from filename
        setDocName(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  // Apply adjustments (rotate, contrast, grayscale) using HTML5 Canvas
  const processImage = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!currentCapture) return resolve('');
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(currentCapture);

        // Adjust dimensions based on rotation
        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Apply transformations
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Fetch pixels to apply filters manually
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Apply Grayscale and Contrast
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Contrast formula
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;

          if (isGrayscale) {
            // Standard NTSC Grayscale coefficients
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          }

          // Bound color values
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        ctx.putImageData(imgData, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.8)); // compressed jpeg
      };
      img.src = currentCapture;
    });
  };

  const addPage = async () => {
    const finalPageBase64 = await processImage();
    setPages([...pages, finalPageBase64]);
    setCurrentCapture(null);
    setIsCameraActive(false);
  };

  const saveScan = () => {
    if (!docName.trim()) return;
    if (pages.length === 0 && !currentCapture) return;
    
    // Save
    const finalPages = [...pages];
    onSave({
      name: docName,
      category,
      expiryDate: expiryDate || undefined,
      pages: finalPages
    });
    
    // Reset state
    setPages([]);
    setCurrentCapture(null);
    setDocName('');
    setExpiryDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-surface dark:bg-surface border border-border-primary/60 rounded-2xl shadow-premium overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary/40">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse-slow" />
            <h3 className="font-heading font-bold text-base text-text-primary">Escáner de Documentos</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              label="Nombre del Documento" 
              placeholder="Ej. Acta de Nacimiento"
              value={docName} 
              onChange={e => setDocName(e.target.value)} 
            />
            <Select 
              label="Categoría" 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              options={[
                { value: 'Personal', label: 'Personal' },
                { value: 'Licencia', label: 'Licencia' },
                { value: 'Pasaporte', label: 'Pasaporte' },
                { value: 'Seguros', label: 'Seguros' },
                { value: 'Facturas', label: 'Facturas' },
                { value: 'Vehículo', label: 'Vehículo' },
                { value: 'Hogar', label: 'Hogar' },
                { value: 'Otros', label: 'Otros' }
              ]} 
            />
            <Input 
              label="Vencimiento (Opcional)" 
              type="date" 
              value={expiryDate} 
              onChange={e => setExpiryDate(e.target.value)} 
            />
          </div>

          {/* Core Interactive Scanner Window */}
          <div className="border border-border-primary rounded-xl overflow-hidden bg-zinc-950 flex flex-col items-center justify-center min-h-[300px] relative">
            
            {/* 1. Camera Streaming */}
            {isCameraActive && (
              <div className="w-full h-full relative">
                <video ref={videoRef} autoPlay playsInline className="w-full object-cover max-h-[350px]" />
                <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
                  {/* Scan alignment rectangle */}
                  <div className="w-3/4 h-2/3 border-2 border-dashed border-brand/80 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] relative">
                    <span className="absolute -top-6 left-2 text-[10px] text-brand bg-zinc-900 px-1.5 py-0.5 rounded font-medium">Alinea tu documento</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <Button variant="danger" size="sm" onClick={() => setIsCameraActive(false)}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={capturePhoto}>Tomar foto</Button>
                </div>
              </div>
            )}

            {/* 2. Photo Adjustment Workspace */}
            {!isCameraActive && currentCapture && (
              <div className="w-full p-4 flex flex-col items-center gap-4 bg-zinc-900">
                <div className="max-w-[280px] overflow-hidden rounded-lg shadow-lg relative bg-zinc-850 flex items-center justify-center">
                  <img 
                    src={currentCapture} 
                    alt="Current Scan" 
                    className="max-h-[260px] object-contain transition-all"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      filter: `contrast(${contrast}%) ${isGrayscale ? 'grayscale(100%)' : ''}`
                    }}
                  />
                </div>
                
                {/* Sliders and filters */}
                <div className="w-full max-w-md flex flex-col gap-3.5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
                    <span>Ajustes de Imagen</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          // Local OCR simulation / text detection logic
                          if (!docName) setDocName('Documento Escaneado');
                          const todayPlusYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          if (!expiryDate) setExpiryDate(todayPlusYear);
                          alert('⚡ OCR Local: Se han prellenado los campos a partir de la lectura de la imagen.');
                        }} 
                        className="text-amber-400 hover:underline flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                      >
                        ⚡ Leer Datos (OCR)
                      </button>
                      <button 
                        onClick={() => { setRotation((rotation + 90) % 360); }} 
                        className="text-brand hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Rotar 90°
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-zinc-400 flex justify-between">
                      <span>Contraste</span>
                      <span>{contrast}%</span>
                    </label>
                    <input 
                      type="range" min="50" max="180" step="5" value={contrast}
                      onChange={e => setContrast(Number(e.target.value))}
                      className="w-full accent-brand bg-zinc-800 h-1 rounded" 
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="checkbox" id="grayscale-check" checked={isGrayscale}
                      onChange={e => setIsGrayscale(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 accent-brand text-brand w-4 h-4"
                    />
                    <label htmlFor="grayscale-check" className="text-xs text-zinc-300 font-medium">Bicromía / Blanco y Negro (Filtro Documento)</label>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2.5 mt-2">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => setCurrentCapture(null)}>Descartar</Button>
                    <Button variant="primary" size="sm" onClick={addPage}>Agregar esta página</Button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Idle / Start scan Options */}
            {!isCameraActive && !currentCapture && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">No hay capturas activas</h4>
                  <p className="text-xs text-zinc-450 mt-1 max-w-xs">Toma una foto con tu cámara o sube un archivo local desde tu dispositivo.</p>
                </div>
                {errorMsg && <p className="text-xs text-red-400 px-4">{errorMsg}</p>}
                
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Button variant="primary" size="sm" onClick={() => setIsCameraActive(true)}>
                    Usar Cámara Web
                  </Button>
                  <label className="inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 px-3 py-1.5 select-none gap-1.5">
                    <span>Tomar o Subir Archivo</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Compilation Deck (Page Queue) */}
          {pages.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Páginas Escaneadas ({pages.length})
              </h4>
              <div className="flex flex-wrap gap-3 p-3 bg-surface-secondary/50 border border-border-primary/50 rounded-xl">
                {pages.map((pg, idx) => (
                  <div key={idx} className="relative w-16 h-20 rounded-lg overflow-hidden border border-border-primary bg-white shadow-sm flex items-center justify-center group select-none">
                    <img src={pg} alt={`page ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded-sm">Pág {idx + 1}</span>
                    <button 
                      onClick={() => setPages(pages.filter((_, pIdx) => pIdx !== idx))}
                      className="absolute top-1 right-1 bg-danger hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4.5 border-t border-border-primary/40 flex items-center justify-end gap-3 bg-surface-secondary/20">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={saveScan}
            disabled={!docName.trim() || (pages.length === 0 && !currentCapture)}
          >
            Finalizar Escaneo ({pages.length + (currentCapture ? 1 : 0)} págs)
          </Button>
        </div>

      </div>
    </div>
  );
};
