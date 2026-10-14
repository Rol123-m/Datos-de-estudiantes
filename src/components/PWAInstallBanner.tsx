import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Top Banner on Mobile / Desktop */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <span className="font-semibold block sm:inline">¿Quieres usarlo como APK / App en tu móvil?</span>{' '}
            <span className="text-blue-100 hidden sm:inline">Instálala en tu pantalla de inicio para acceso instantáneo.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-white text-blue-700 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 active:scale-95 transition-all shadow-xs text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar APK / App</span>
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 bg-white text-blue-700 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 active:scale-95 transition-all shadow-xs text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Instalar en iPhone</span>
            </button>
          )}

          {!isInstallable && !isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-medium px-2.5 py-1.5 rounded-lg transition-all text-xs"
            >
              <span>Cómo instalar</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white p-1 rounded-md"
            aria-label="Cerrar banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal with instructions for Android and iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Instalar en tu teléfono móvil</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs">1</span>
                  En Android (Chrome / APK):
                </div>
                <p className="text-slate-700 pl-6">
                  Toca el menú de <strong>tres puntos (⋮)</strong> en la esquina superior derecha y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-xs">2</span>
                  En iPhone / iPad (Safari):
                </div>
                <div className="space-y-1.5 text-slate-700 pl-6">
                  <p className="flex items-center gap-1.5">
                    1. Toca el botón de <Share2 className="w-4 h-4 text-blue-600 inline" /> <strong>Compartir</strong> en la barra inferior.
                  </p>
                  <p className="flex items-center gap-1.5">
                    2. Desliza hacia abajo y toca <PlusSquare className="w-4 h-4 text-slate-700 inline" /> <strong>"Agregar a inicio"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Se abrirá a pantalla completa sin barra de navegación, exactamente como una app nativa instalada.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
