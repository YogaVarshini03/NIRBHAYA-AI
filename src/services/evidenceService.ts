import { EvidenceItem } from '../types';
import { apiUrl } from './apiConfig';

export const DEFAULT_EVIDENCE: EvidenceItem[] = [];

const VAULT_TOKEN_KEY = 'nirbhaya_vault_session_token';

class EvidenceService {
  private vaultToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.vaultToken = sessionStorage.getItem(VAULT_TOKEN_KEY);
      } catch {
        this.vaultToken = null;
      }
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('nirbhaya_auth_token');
  }

  public getVaultToken(): string | null {
    return this.vaultToken;
  }

  public isVaultAuthorized(): boolean {
    if (!this.vaultToken && typeof window !== 'undefined') {
      this.vaultToken = sessionStorage.getItem(VAULT_TOKEN_KEY);
    }
    return Boolean(this.vaultToken);
  }

  public async verifyAccessKey(accessKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authToken = this.getAuthToken();
      const res = await fetch(apiUrl('/api/evidence/access/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
        },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Verification failed. Invalid NIRBHAYA Access Key.' };
      }

      this.vaultToken = data.vaultToken;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(VAULT_TOKEN_KEY, data.vaultToken);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error verifying access key.' };
    }
  }

  public async lockVault(): Promise<void> {
    if (this.vaultToken) {
      try {
        const authToken = this.getAuthToken();
        await fetch(apiUrl('/api/evidence/access/revoke'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken || ''}`,
            'x-evidence-vault-token': this.vaultToken,
          },
          body: JSON.stringify({ vaultToken: this.vaultToken }),
        });
      } catch {}
    }

    this.vaultToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(VAULT_TOKEN_KEY);
    }
  }

  public getFileUrl(id: string): string {
    if (!this.vaultToken && typeof window !== 'undefined') {
      this.vaultToken = sessionStorage.getItem(VAULT_TOKEN_KEY);
    }
    const token = this.vaultToken || '';
    return apiUrl(`/api/evidence/${id}/file?vaultToken=${encodeURIComponent(token)}`);
  }

  public async fetchEvidenceFromBackend(): Promise<EvidenceItem[]> {
    if (!this.vaultToken && typeof window !== 'undefined') {
      this.vaultToken = sessionStorage.getItem(VAULT_TOKEN_KEY);
    }
    if (!this.vaultToken) return [];

    try {
      const authToken = this.getAuthToken();
      const res = await fetch(apiUrl('/api/evidence'), {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'x-evidence-vault-token': this.vaultToken,
        },
      });

      if (res.status === 401 || res.status === 403) {
        // Vault session expired or revoked
        this.vaultToken = null;
        if (typeof window !== 'undefined') sessionStorage.removeItem(VAULT_TOKEN_KEY);
        return [];
      }

      if (res.ok) {
        const data = await res.json();
        if (data.evidence && Array.isArray(data.evidence)) {
          return data.evidence.map((item: any) => {
            const hasGps = item.latitude !== null && item.latitude !== undefined && item.longitude !== null && item.longitude !== undefined && !isNaN(Number(item.latitude));
            const latNum = Number(item.latitude);
            const lonNum = Number(item.longitude);
            const accNum = Math.round(Number(item.gpsAccuracy) || 10);
            const gpsLocation = hasGps
              ? `GPS: ${latNum.toFixed(4)}, ${lonNum.toFixed(4)} (±${accNum}m)`
              : 'GPS unavailable — permission not granted';

            const sizeBytes = Number(item.fileSize) || 0;
            const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
            const sizeKb = Math.round(sizeBytes / 1024);
            const displaySize = sizeBytes > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

            return {
              id: item.id,
              type: item.type === 'photo' ? 'snapshot' : item.type,
              title: item.title,
              timestamp: new Date(item.createdAt).toLocaleString(),
              location: gpsLocation,
              duration: item.durationSec ? `00:${item.durationSec.toString().padStart(2, '0')}` : 'N/A',
              fileType: item.mimeType,
              size: displaySize,
              isLocked: Boolean(item.isLocked),
              sha256Hash: item.sha256Hash,
              userId: item.userId,
              userName: item.userName,
              incidentId: item.incidentId,
              latitude: item.latitude,
              longitude: item.longitude,
              gpsAccuracy: item.gpsAccuracy,
              capturedAt: item.capturedAt,
              downloadUrl: this.getFileUrl(item.id),
              fileUrl: this.getFileUrl(item.id),
              chainOfCustody: [
                { stage: 'Evidence Created', timestamp: new Date(item.createdAt).toLocaleTimeString(), verified: true },
                { stage: 'SHA-256 Generated', timestamp: new Date(item.createdAt).toLocaleTimeString(), verified: true },
                { stage: 'Evidence Stored in Vault', timestamp: new Date(item.createdAt).toLocaleTimeString(), verified: true },
              ]
            } as EvidenceItem;
          });
        }
      }
    } catch (err) {
      console.warn('[evidenceService] Fetch failed:', err);
    }
    return [];
  }

  public async uploadRealEvidence(
    file: Blob,
    type: 'photo' | 'audio' | 'video',
    title: string,
    metadata?: { durationSec?: number; latitude?: number | null; longitude?: number | null; accuracy?: number | null; incidentId?: string }
  ): Promise<EvidenceItem | null> {
    if (!this.vaultToken) return null;

    try {
      const authToken = this.getAuthToken();
      const formData = new FormData();
      const ext = type === 'photo' ? '.jpg' : type === 'audio' ? '.webm' : '.mp4';
      const fileName = `evidence_${Date.now()}${ext}`;

      formData.append('file', file, fileName);
      formData.append('type', type);
      formData.append('title', title);
      formData.append('incidentId', metadata?.incidentId || 'direct_capture');

      if (metadata?.durationSec) {
        formData.append('durationSec', String(metadata.durationSec));
      }
      if (metadata?.latitude !== undefined && metadata?.latitude !== null) {
        formData.append('latitude', String(metadata.latitude));
      }
      if (metadata?.longitude !== undefined && metadata?.longitude !== null) {
        formData.append('longitude', String(metadata.longitude));
      }
      if (metadata?.accuracy !== undefined && metadata?.accuracy !== null) {
        formData.append('gpsAccuracy', String(metadata.accuracy));
      }

      const res = await fetch(apiUrl('/api/evidence/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'x-evidence-vault-token': this.vaultToken,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const uploaded = data.evidence;
        const hasGps = uploaded.latitude !== null && uploaded.longitude !== null;
        const gpsLocation = hasGps
          ? `GPS: ${uploaded.latitude.toFixed(4)}, ${uploaded.longitude.toFixed(4)} (±${Math.round(uploaded.gpsAccuracy || 10)}m)`
          : 'GPS unavailable — permission not granted';

        const sizeKb = uploaded.fileSize ? Math.round(uploaded.fileSize / 1024) : 0;
        const displaySize = uploaded.fileSize > 1024 * 1024
          ? `${(uploaded.fileSize / (1024 * 1024)).toFixed(2)} MB`
          : `${sizeKb} KB`;

        return {
          id: uploaded.id,
          type: type === 'photo' ? 'snapshot' : type,
          title: uploaded.title,
          timestamp: new Date().toLocaleString(),
          location: gpsLocation,
          duration: uploaded.durationSec ? `00:${uploaded.durationSec.toString().padStart(2, '0')}` : 'N/A',
          fileType: uploaded.mimeType,
          size: displaySize,
          isLocked: true,
          sha256Hash: uploaded.sha256Hash,
          userId: uploaded.userId,
          userName: uploaded.userName,
          incidentId: uploaded.incidentId,
          latitude: uploaded.latitude,
          longitude: uploaded.longitude,
          gpsAccuracy: uploaded.gpsAccuracy,
          capturedAt: uploaded.capturedAt,
          downloadUrl: this.getFileUrl(uploaded.id),
          fileUrl: this.getFileUrl(uploaded.id),
          chainOfCustody: [
            { stage: 'Evidence Created', timestamp: new Date().toLocaleTimeString(), verified: true },
            { stage: 'SHA-256 Generated', timestamp: new Date().toLocaleTimeString(), verified: true },
            { stage: 'Evidence Stored in Vault', timestamp: new Date().toLocaleTimeString(), verified: true },
          ]
        };
      }
    } catch (err) {
      console.error('[evidenceService] Upload failed:', err);
    }
    return null;
  }

  public async fetchMetadata(id: string): Promise<any> {
    if (!this.vaultToken) return null;
    try {
      const authToken = this.getAuthToken();
      const res = await fetch(apiUrl(`/api/evidence/${id}/metadata`), {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'x-evidence-vault-token': this.vaultToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.metadata;
      }
    } catch (err) {
      console.warn('[evidenceService] Metadata fetch failed:', err);
    }
    return null;
  }

  public async toggleLock(id: string, currentlyLocked: boolean): Promise<boolean> {
    if (!this.vaultToken) return currentlyLocked;
    try {
      const authToken = this.getAuthToken();
      const action = currentlyLocked ? 'unlock' : 'lock';
      const res = await fetch(apiUrl(`/api/evidence/${id}/${action}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'x-evidence-vault-token': this.vaultToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.isLocked);
      }
    } catch (err) {
      console.warn('[evidenceService] Toggle lock failed:', err);
    }
    return currentlyLocked;
  }

  public async deleteEvidence(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.vaultToken) return { success: false, error: 'Vault unauthorized.' };
    try {
      const authToken = this.getAuthToken();
      const res = await fetch(apiUrl(`/api/evidence/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'x-evidence-vault-token': this.vaultToken,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to delete evidence.' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error deleting evidence.' };
    }
  }
}

export const evidenceService = new EvidenceService();
