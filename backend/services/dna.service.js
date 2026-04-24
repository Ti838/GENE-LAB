/**
 * GeneLab DNA Analysis Service
 * Real computational logic for DNA sequence analysis
 */

/**
 * Parse a raw file content string to extract clean DNA sequence.
 * Supports FASTA, plain text, and CSV formats.
 */
function parseSequence(rawContent) {
    // Remove FASTA headers (lines starting with >)
    let lines = rawContent.split(/\r?\n/);
    lines = lines.filter(line => !line.startsWith('>') && line.trim().length > 0);

    // Join and clean — keep only valid nucleotide characters
    const sequence = lines.join('').replace(/[^ATGCatgc]/g, '').toUpperCase();
    return sequence;
}

/**
 * Basic Analysis: count nucleotides, GC content, AT ratio, sequence length
 */
function basicAnalysis(sequence) {
    const len = sequence.length;
    const counts = { A: 0, T: 0, G: 0, C: 0 };

    for (const ch of sequence) {
        if (counts.hasOwnProperty(ch)) counts[ch]++;
    }

    const gcContent = len > 0 ? parseFloat((((counts.G + counts.C) / len) * 100).toFixed(2)) : 0;
    const atRatio = len > 0 ? parseFloat((((counts.A + counts.T) / len) * 100).toFixed(2)) : 0;

    return {
        totalNucleotides: len,
        counts,
        gcContent,
        atRatio
    };
}

/**
 * Pattern Search: find all occurrences of a pattern in the sequence
 */
function patternSearch(sequence, pattern) {
    const pat = pattern.toUpperCase();
    const positions = [];
    let idx = sequence.indexOf(pat);
    while (idx !== -1) {
        positions.push(idx);
        idx = sequence.indexOf(pat, idx + 1);
    }
    return {
        pattern: pat,
        count: positions.length,
        positions: positions.slice(0, 100) // Limit to first 100 for performance
    };
}

/**
 * Detect repeated sequences (k-mers) of a given length
 */
function detectRepeats(sequence, kmerLength = 6) {
    const kmerCounts = {};
    for (let i = 0; i <= sequence.length - kmerLength; i++) {
        const kmer = sequence.substring(i, i + kmerLength);
        kmerCounts[kmer] = (kmerCounts[kmer] || 0) + 1;
    }

    // Filter only repeated k-mers (count > 1), sort descending
    const repeats = Object.entries(kmerCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50) // Top 50
        .map(([kmer, count]) => ({ kmer, count }));

    return repeats;
}

/**
 * Reverse Complement of a DNA sequence
 */
function reverseComplement(sequence) {
    const complementMap = { A: 'T', T: 'A', G: 'C', C: 'G' };
    return sequence.split('').reverse().map(ch => complementMap[ch] || ch).join('');
}

/**
 * DNA → RNA Transcription
 */
function transcribeToRNA(sequence) {
    return sequence.replace(/T/g, 'U');
}

/**
 * Compare two DNA sequences: highlight mismatches and detect basic mutations
 */
function compareSequences(seq1, seq2) {
    const maxLen = Math.max(seq1.length, seq2.length);
    const minLen = Math.min(seq1.length, seq2.length);
    const mismatches = [];
    let matchCount = 0;

    for (let i = 0; i < minLen; i++) {
        if (seq1[i] === seq2[i]) {
            matchCount++;
        } else {
            mismatches.push({
                position: i,
                seq1: seq1[i],
                seq2: seq2[i],
                type: 'substitution'
            });
        }
    }

    // If lengths differ, remaining bases are insertions/deletions
    if (seq1.length > seq2.length) {
        for (let i = minLen; i < seq1.length; i++) {
            mismatches.push({ position: i, seq1: seq1[i], seq2: '-', type: 'deletion_in_seq2' });
        }
    } else if (seq2.length > seq1.length) {
        for (let i = minLen; i < seq2.length; i++) {
            mismatches.push({ position: i, seq1: '-', seq2: seq2[i], type: 'insertion_in_seq2' });
        }
    }

    const similarity = maxLen > 0 ? parseFloat(((matchCount / maxLen) * 100).toFixed(2)) : 0;

    return {
        seq1Length: seq1.length,
        seq2Length: seq2.length,
        matchCount,
        mismatchCount: mismatches.length,
        similarity,
        mismatches: mismatches.slice(0, 200) // Limit output
    };
}

module.exports = {
    parseSequence,
    basicAnalysis,
    patternSearch,
    detectRepeats,
    reverseComplement,
    transcribeToRNA,
    compareSequences
};
