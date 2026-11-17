export class ARExporter {
  /**
   * Detects the client platform and capabilities.
   */
  static getPlatform() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);

    return {
      isIOS,
      isAndroid,
      isMobile: isIOS || isAndroid
    };
  }

  /**
   * Launches Augmented Reality on the appropriate device, or triggers QR modal on desktop.
   * @param {object} params
   * @param {string} params.glbUrl - Direct URL of .glb model
   * @param {string} [params.usdzUrl] - Direct URL of .usdz model (for iOS)
   * @param {string} [params.title='Product AR'] - Product title
   * @param {function} [params.onDesktopQR] - Callback when accessed from desktop
   */
  static launchAR({ glbUrl, usdzUrl, title = 'Product AR', onDesktopQR }) {
    const { isIOS, isAndroid, isMobile } = this.getPlatform();

    if (!isMobile) {
      if (onDesktopQR) {
        onDesktopQR(window.location.href);
      }
      return;
    }

    if (isIOS) {
      this.launchAppleQuickLook(usdzUrl || glbUrl);
    } else if (isAndroid) {
      this.launchGoogleSceneViewer(glbUrl, title);
    }
  }

  /**
   * Triggers Apple QuickLook on iOS devices.
   */
  static launchAppleQuickLook(usdzUrl) {
    if (!usdzUrl) {
      alert('iOS AR requires a USDZ model asset.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.setAttribute('rel', 'ar');
    anchor.setAttribute('href', usdzUrl);

    // Apple QuickLook requires a child img element with valid src to activate
    const img = document.createElement('img');
    img.alt = 'AR QuickLook';
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';
    anchor.appendChild(img);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  /**
   * Triggers Google Scene Viewer intent on Android devices.
   */
  static launchGoogleSceneViewer(glbUrl, title) {
    if (!glbUrl) {
      alert('Android AR requires a GLB model asset URL.');
      return;
    }

    const fallbackUrl = window.location.href;
    const sceneViewerUrl =
      `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}` +
      `&mode=ar_preferred&resizable=false&title=${encodeURIComponent(title)}` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`;

    window.location.href = sceneViewerUrl;
  }
}
