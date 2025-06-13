
"use client";

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface GeoGebraPlotProps {
  expression: string;
  id: string; // Unique ID for this instance, e.g., message ID
}

declare global {
  interface Window {
    GGBApplet: any; // GeoGebra applet constructor
  }
}

export default function GeoGebraPlot({ expression, id }: GeoGebraPlotProps) {
  const ggbContainerId = `ggb-container-${id}`;
  const appletRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isAppletReady, setIsAppletReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = document.getElementById(ggbContainerId);

    // If script isn't loaded, or no expression, or container doesn't exist yet for injection
    if (!isScriptLoaded || !expression || (!container && expression)) {
      // Cleanup previous applet if it exists
      if (appletRef.current) {
        try {
          console.log("GeoGebra: Effect triggered cleanup of old applet (script not loaded/no expression). ID:", id);
          appletRef.current.remove();
        } catch (e) {
          console.error("GeoGebra: Error removing applet during pre-check cleanup:", e);
        }
        appletRef.current = null;
      }
      if (container) { // If container exists but we are not injecting, ensure it's empty
          container.innerHTML = '';
      }
      setIsAppletReady(false);
      if (!expression && isScriptLoaded) setError(null); // Clear errors if expression is removed
      return;
    }
    
    // Script is loaded, we have an expression, and container should exist (due to conditional rendering below)
    console.log(`GeoGebra: Effect triggered. ScriptLoaded: ${isScriptLoaded}, Expression: ${expression}, ID: ${id}`);

    // Clean up any existing applet from a previous render/expression for this component instance
    if (appletRef.current) {
      try {
        console.log("GeoGebra: Removing existing applet instance before creating new one. ID:", id);
        appletRef.current.remove();
      } catch (e) {
        console.error("GeoGebra: Error removing previous applet instance:", e);
      }
      appletRef.current = null;
    }
    if (container) { // Container should exist due to conditional rendering
        container.innerHTML = ''; // Ensure it's clean before new injection
    }


    setIsAppletReady(false); // Reset readiness for the new applet
    setError(null);

    const parameters = {
      appName: "graphing",
      width: 450,
      height: 350,
      showToolBar: false,
      showAlgebraInput: false,
      showMenuBar: false,
      enableLabelDrags: false,
      enableShiftDragZoom: true,
      appletOnLoad: (api: any) => {
        console.log(`GeoGebra: appletOnLoad CALLED for expression: "${expression}" in container ${ggbContainerId}`);
        try {
          api.evalCommand(expression);
          setIsAppletReady(true);
          setError(null);
        } catch (evalError: any) {
          console.error(`GeoGebra: Error evaluating command '${expression}':`, evalError);
          setError(`Could not plot: ${evalError.message || 'Invalid expression'}`);
          setIsAppletReady(false);
        }
      },
      id: `ggbAppletInstance-${id}`, // Unique ID for the applet instance itself
    };

    let newAppletInstance: any = null;
    try {
      console.log("GeoGebra: Creating new GGBApplet instance for container:", ggbContainerId);
      newAppletInstance = new window.GGBApplet(parameters, '5.0');
      if (container) {
        newAppletInstance.inject(ggbContainerId);
        appletRef.current = newAppletInstance;
      } else {
         throw new Error("GeoGebra container div not found at injection time.");
      }
    } catch (initError: any) {
      console.error("GeoGebra: Error initializing or injecting GGBApplet:", initError);
      setError(`GeoGebra initialization failed: ${initError.message}`);
      setIsAppletReady(false);
    }

    return () => {
      console.log(`GeoGebra: Cleanup effect for ID ${id}. Current appletRef:`, appletRef.current);
      // Use the ref for cleanup as it holds the latest applet for this component instance
      const appletToRemove = appletRef.current;
      if (appletToRemove && typeof appletToRemove.remove === 'function') {
        try {
          console.log("GeoGebra: Cleanup calling appletToRemove.remove() for ID:", id);
          appletToRemove.remove();
        } catch (e) {
          console.error("GeoGebra: Error during applet.remove() in cleanup:", e);
        }
      }
      appletRef.current = null; // Clear the ref after attempting removal

      const cleanupContainer = document.getElementById(ggbContainerId);
      if (cleanupContainer) {
        console.log("GeoGebra: Cleanup clearing container innerHTML for ID", ggbContainerId);
        cleanupContainer.innerHTML = ''; // Ensure container is empty
      }
      setIsAppletReady(false); // Reset readiness on cleanup
    };
  }, [isScriptLoaded, expression, id, ggbContainerId]);


  return (
    <div className="my-4 p-2 border rounded-md bg-muted/20">
      <Script
        src="https://www.geogebra.org/apps/deployggb.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("GeoGebra: deployggb.js SCRIPT LOADED.");
          setIsScriptLoaded(true);
          setError(null);
        }}
        onError={(e) => {
          console.error("GeoGebra: FAILED to load deployggb.js script:", e);
          setError("Failed to load GeoGebra script.");
          setIsScriptLoaded(false);
        }}
      />

      {/* Loading and Error Messages - Rendered as siblings, not children of ggbContainerId */}
      {!isScriptLoaded && !error && (
        <div className="flex flex-col items-center justify-center h-[350px] w-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading GeoGebra script...</p>
        </div>
      )}
      {isScriptLoaded && !isAppletReady && expression && !error && (
         <div className="flex flex-col items-center justify-center h-[350px] w-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Initializing GeoGebra plot for: "{expression}"</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center bg-destructive/10 p-4 h-[350px] w-full">
          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive text-center font-medium">GeoGebra Error</p>
          <p className="text-xs text-destructive/80 text-center">{error}</p>
        </div>
      )}

      {/* GeoGebra Target Div - Only render if script loaded and no error and expression exists */}
      {isScriptLoaded && !error && expression && (
        <div
          id={ggbContainerId}
          style={{
            width: '100%',
            height: '350px',
            position: 'relative', // Needed if GeoGebra positions absolutely within
            display: isAppletReady ? 'block' : 'none', // Hide until applet signals readiness
          }}
        >
          {/* GeoGebra injects here. This div itself should not have React children */}
        </div>
      )}
      
      {isAppletReady && expression && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Interactive plot powered by GeoGebra. Expression: "{expression}"
        </p>
      )}
    </div>
  );
}
