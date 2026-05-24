// results-ui.js — render analysis results on result page
(function () {
  function createCard(title, value, sub) {
    const el = document.createElement('div');
    el.className = 'p-4 bg-slate-800 rounded-lg shadow';
    el.innerHTML = `<div class="text-sm text-slate-400">${title}</div><div class="text-2xl font-bold mt-1">${value}</div>${sub ? `<div class="text-xs text-slate-400 mt-1">${sub}</div>` : ''}`;
    return el;
  }

  function renderSummary(container, data) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-4';
    grid.appendChild(createCard('Status', data.status || 'completed', `Type: ${data.analysisType}`));
    grid.appendChild(createCard('Sequence length', data.sequenceLength || data.statistics?.sequence_length || 0, 'bp'));
    grid.appendChild(createCard('GC content', (data.gcContent || data.statistics?.gc_content || 0) + '%', ''));
    grid.appendChild(createCard('Confidence', (data.confidence || 0) + '%', ''));
    container.appendChild(grid);
  }

  function renderMutations(container, data) {
    container.innerHTML = '';
    const mutations = data.mutation_analysis?.variants || data.variants || [];
    if (!mutations || mutations.length === 0) {
      container.innerHTML = '<p class="italic text-slate-400">No mutations reported.</p>';
      return;
    }
    mutations.slice(0, 50).forEach(v => {
      const div = document.createElement('div');
      div.className = 'p-3 mb-2 bg-slate-800 rounded-lg';
      div.innerHTML = `<div class="font-semibold">${v.variant_id || v.rsid || 'variant'}</div><div class="text-sm text-slate-400">${v.gene || ''} — ${v.clinical_significance || ''} — ${v.severity || ''}</div>`;
      container.appendChild(div);
    });
  }

  function renderNucleotideChart(ctx, data) {
    const freq = data.nucleotideFrequency || data.statistics?.nucleotide_frequency || {};
    const labels = ['A','T','G','C','N'];
    const values = labels.map(l => freq[l] || 0);
    if (window._genelab_chart) window._genelab_chart.destroy();
    window._genelab_chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Nucleotide count', data: values, backgroundColor: ['#06B6D4','#14B8A6','#818CF8','#A78BFA','#94A3B8'] }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  function renderCodonChart(ctx, data) {
    const codonObj = data.codon_analysis?.codon_frequency || (data.result && data.result.codon_analysis && data.result.codon_analysis.codon_frequency) || {};
    const entries = Object.entries(codonObj).slice(0, 30);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);
    const cfg = {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Codon frequency', data: values, backgroundColor: '#8b5cf6' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 90 } } } }
    };
    if (window._genelab_codon_chart) window._genelab_codon_chart.destroy();
    window._genelab_codon_chart = new Chart(ctx, cfg);
  }

  function renderResultPage(data) {
    const summary = document.getElementById('result-summary');
    const mutations = document.getElementById('result-mutations');
    const chartCtx = document.getElementById('nuc-chart').getContext('2d');
    renderSummary(summary, data.result || data);
    renderMutations(mutations, data.result || data);
    renderNucleotideChart(chartCtx, data.result || data);
    // codon chart element
    const codonEl = document.getElementById('codon-chart');
    if (codonEl) renderCodonChart(codonEl.getContext('2d'), data.result || data);
    // Scientific summary
    const sci = document.getElementById('scientific-summary');
    sci.textContent = (data.result || data).scientific_summary || (data.result || data).scientificExplanation || '';
    // If deep analysis, render BLAST hits
    if ((data.result || data).analysisType === 'deep' || (data.result || data).blastResult) {
      const hits = (data.result || data).hits || (data.result || data).blastResult?.hits || [];
      const container = document.getElementById('deep-hits');
      if (container) {
        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'min-w-full text-sm';
        const head = document.createElement('thead');
        head.innerHTML = '<tr class="text-left text-slate-400"><th>#</th><th>Accession</th><th>Identity %</th><th>E-value</th><th>Organism</th></tr>';
        table.appendChild(head);
        const body = document.createElement('tbody');
        hits.slice(0, 20).forEach((h, i) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td class="pr-4">${i+1}</td><td class="pr-4">${h.accession || h.subject_acc || ''}</td><td class="pr-4">${h.identity_percentage || h.identity_pct || 0}%</td><td class="pr-4">${h.e_value || h.evalue || ''}</td><td>${h.organism || h.subject_tax || ''}</td>`;
          body.appendChild(tr);
        });
        table.appendChild(body);
        container.appendChild(table);
        // render alignment viewer for top hit
        const top = hits[0];
        if (top && top.query_alignment && top.subject_alignment) {
          const alignDiv = document.createElement('div');
          alignDiv.className = 'mt-4 p-3 bg-slate-800 rounded';
          alignDiv.innerHTML = '<h4 class="font-semibold mb-2">Top alignment preview</h4>';
          const qpre = document.createElement('pre'); qpre.className = 'bg-black/10 p-2 rounded mb-1';
          const spre = document.createElement('pre'); spre.className = 'bg-black/10 p-2 rounded';
          qpre.textContent = top.query_alignment || top.hsp_qseq || '';
          spre.textContent = top.subject_alignment || top.hsp_hseq || '';
          alignDiv.appendChild(qpre); alignDiv.appendChild(spre);
          container.appendChild(alignDiv);
        }
      }
    }
  }

  window.ResultsUI = { renderResultPage };
})();
