/**
 * ChitraHarsha VisvaDarsana - Auto-Update System
 * Version: 2.0.0
 *
 * Features:
 * - Version checking
 * - Automatic updates
 * - Update scheduling
 * - Rollback capability
 * - Progress tracking
 * - User notifications
 *
 * Copyright (c) 2026 The ChitraHarsha VPK Ventures
 * All Rights Reserved
 */

class AutoUpdateSystem {
  constructor() {
    this.version = "2.0.0";
    this.currentVersion = "2.0.0";
    this.updateCheckInterval = 60 * 60 * 1000; // Check every hour
    this.updateServerUrl = "https://api.chitraharsha.com/updates"; // Simulated
    this.lastCheckTime = null;
    this.updateAvailable = false;
    this.isUpdating = false;

    console.log(`🔄 Auto-Update System v${this.version} initialized`);
  }

  /**
   * Initialize auto-updater
   */
  async initialize() {
    // Register service worker
    if ("serviceWorker" in navigator) {
      try {
        const registration =
          await navigator.serviceWorker.register("/service-worker.js");
        console.log("✅ Service Worker registered:", registration);

        // Check for updates on page load
        await this.checkForUpdates();

        // Set up periodic update checks
        this.startPeriodicChecks();

        // Listen for service worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              this.notifyUpdateAvailable();
            }
          });
        });
      } catch (error) {
        console.error("❌ Service Worker registration failed:", error);
      }
    }
  }

  /**
   * Check for available updates
   * @returns {Promise<object>} Update info
   */
  async checkForUpdates() {
    console.log("🔍 Checking for updates...");
    this.lastCheckTime = new Date();

    try {
      // Simulate API call to update server
      const updateInfo = await this.fetchUpdateInfo();

      if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
        this.updateAvailable = true;
        console.log(`✨ Update available: v${updateInfo.version}`);
        return {
          available: true,
          version: updateInfo.version,
          releaseNotes: updateInfo.releaseNotes,
          size: updateInfo.size,
          critical: updateInfo.critical,
        };
      } else {
        console.log("✅ Already running latest version");
        return { available: false };
      }
    } catch (error) {
      console.error("❌ Update check failed:", error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Fetch update information from server
   * @returns {Promise<object>} Update info
   */
  async fetchUpdateInfo() {
    // Simulate server response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          version: "2.1.0",
          releaseDate: "2026-02-20",
          releaseNotes: [
            "Enhanced AI capabilities",
            "Improved security features",
            "Performance optimizations",
            "New blog articles",
          ],
          size: "5.2 MB",
          critical: false,
          downloadUrl: "https://api.chitraharsha.com/updates/v2.1.0",
        });
      }, 500);
    });
  }

  /**
   * Download and install update
   * @param {boolean} userInitiated - Whether user initiated the update
   * @returns {Promise<boolean>} Success status
   */
  async installUpdate(userInitiated = false) {
    if (this.isUpdating) {
      console.log("⚠️ Update already in progress");
      return false;
    }

    this.isUpdating = true;
    console.log("📥 Installing update...");

    try {
      // Show progress
      this.showUpdateProgress();

      // Simulate update download and installation
      await this.downloadUpdate();
      await this.applyUpdate();

      // Update local version
      this.currentVersion = this.getLatestVersion();
      localStorage.setItem("app_version", this.currentVersion);

      // Clear update flag
      this.updateAvailable = false;
      this.isUpdating = false;

      // Show success notification
      this.showUpdateSuccess();

      // Reload page if user initiated
      if (userInitiated) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }

      return true;
    } catch (error) {
      console.error("❌ Update installation failed:", error);
      this.isUpdating = false;
      this.showUpdateError(error);
      return false;
    }
  }

  /**
   * Download update files
   * @returns {Promise<void>}
   */
  async downloadUpdate() {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        this.updateProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }

  /**
   * Apply downloaded update
   * @returns {Promise<void>}
   */
  async applyUpdate() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("✅ Update applied successfully");
        resolve();
      }, 1000);
    });
  }

  /**
   * Schedule update for later
   * @param {number} hours - Hours to wait
   */
  scheduleUpdate(hours = 24) {
    const scheduleTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    localStorage.setItem("scheduled_update", scheduleTime.toISOString());

    console.log(`⏰ Update scheduled for ${scheduleTime.toLocaleString()}`);

    setTimeout(
      () => {
        this.installUpdate(false);
      },
      hours * 60 * 60 * 1000,
    );
  }

  /**
   * Rollback to previous version
   * @returns {Promise<boolean>} Success status
   */
  async rollback() {
    console.log("⏮️ Rolling back to previous version...");

    const previousVersion = localStorage.getItem("previous_version");
    if (!previousVersion) {
      console.error("❌ No previous version available");
      return false;
    }

    try {
      // Restore previous version from cache
      const caches = await window.caches.keys();
      const previousCache = caches.find((c) => c.includes(previousVersion));

      if (previousCache) {
        // Activate previous cache
        await this.activateCache(previousCache);
        console.log(`✅ Rolled back to v${previousVersion}`);
        window.location.reload();
        return true;
      } else {
        console.error("❌ Previous version cache not found");
        return false;
      }
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      return false;
    }
  }

  /**
   * Start periodic update checks
   */
  startPeriodicChecks() {
    setInterval(async () => {
      const updateInfo = await this.checkForUpdates();

      if (updateInfo.available) {
        if (updateInfo.critical) {
          // Install critical updates automatically
          await this.installUpdate(false);
        } else {
          // Notify user about non-critical updates
          this.notifyUpdateAvailable();
        }
      }
    }, this.updateCheckInterval);
  }

  /**
   * Check if version is newer
   * @param {string} newVersion - New version string
   * @param {string} currentVersion - Current version string
   * @returns {boolean} True if new version is newer
   */
  isNewerVersion(newVersion, currentVersion) {
    const newParts = newVersion.split(".").map(Number);
    const currentParts = currentVersion.split(".").map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  /**
   * UI notification functions
   */
  notifyUpdateAvailable() {
    const toast = document.getElementById("auto-updater-toast");
    if (toast) {
      toast.classList.remove("hidden");
      toast.querySelector("span").textContent =
        "Update available! Click to install.";
      toast.style.cursor = "pointer";
      toast.onclick = () => {
        this.installUpdate(true);
        toast.classList.add("hidden");
      };

      setTimeout(() => {
        if (!this.isUpdating) {
          toast.classList.add("hidden");
        }
      }, 10000);
    }
  }

  showUpdateProgress() {
    const toast = document.getElementById("auto-updater-toast");
    if (toast) {
      toast.classList.remove("hidden");
      toast.querySelector("span").textContent = "Downloading update... 0%";
      toast.style.cursor = "default";
      toast.onclick = null;
    }
  }

  updateProgress(progress) {
    const toast = document.getElementById("auto-updater-toast");
    if (toast) {
      toast.querySelector("span").textContent =
        `Downloading update... ${progress}%`;
    }
  }

  showUpdateSuccess() {
    const toast = document.getElementById("auto-updater-toast");
    if (toast) {
      toast.classList.remove("hidden");
      toast.querySelector("span").textContent =
        "Update installed successfully! Reloading...";
      toast.className = toast.className.replace("bg-green-600", "bg-blue-600");
    }
  }

  showUpdateError(error) {
    const toast = document.getElementById("auto-updater-toast");
    if (toast) {
      toast.classList.remove("hidden");
      toast.querySelector("span").textContent =
        `Update failed: ${error.message}`;
      toast.className = toast.className.replace("bg-green-600", "bg-red-600");

      setTimeout(() => {
        toast.classList.add("hidden");
      }, 5000);
    }
  }

  /**
   * Utility functions
   */
  getLatestVersion() {
    return "2.1.0"; // Simulated
  }

  async activateCache(cacheName) {
    // Implementation for cache activation
    console.log(`Activating cache: ${cacheName}`);
  }

  /**
   * Get update statistics
   * @returns {object} Update stats
   */
  getStats() {
    return {
      currentVersion: this.currentVersion,
      lastCheckTime: this.lastCheckTime,
      updateAvailable: this.updateAvailable,
      isUpdating: this.isUpdating,
      serviceWorkerActive:
        "serviceWorker" in navigator &&
        navigator.serviceWorker.controller !== null,
    };
  }
}

// Create global instance
window.AutoUpdater = new AutoUpdateSystem();

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await window.AutoUpdater.initialize();
  console.log("🔄 Auto-Updater ready");
});
