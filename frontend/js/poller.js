// poller.js — generic job polling helper
(function () {
  async function fetchStatus(jobId) {
    const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
    const res = await fetch(`${API_BASE_URL}/analysis/analysis-status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Failed to fetch job status');
    return res.json();
  }

  async function fetchResult(jobId) {
    const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
    const res = await fetch(`${API_BASE_URL}/analysis/analysis-result/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Failed to fetch job result');
    return res.json();
  }

  async function pollJob(jobId, onProgress, onComplete, onError, interval = 3000) {
    try {
      const status = await fetchStatus(jobId);
      onProgress && onProgress(status);
      if (status.status === 'completed') {
        const result = await fetchResult(jobId);
        onComplete && onComplete(result);
        return;
      }
      if (status.status === 'failed') {
        onError && onError(status.errorMessage || 'Job failed');
        return;
      }
      setTimeout(() => pollJob(jobId, onProgress, onComplete, onError, interval), interval);
    } catch (err) {
      onError && onError(err.message || 'Polling error');
    }
  }

  window.GenelabPoller = { pollJob, fetchStatus, fetchResult };
})();
