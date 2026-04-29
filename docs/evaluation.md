# SignalExtract AI — Evaluation

This project is designed to be **measurable**. Because extraction is evidence-grounded, evaluation can test both correctness and whether signals are supported by the source.

## Create gold labels
1. Select a document set (e.g., 50–200 docs across clinical + operational domains).
2. Define annotation guidelines:
   - what counts as a "finding" vs "clinical_statement"
   - how to treat implied vs explicit statements
   - how to handle duplicates
3. Annotate signals with:
   - `signal_type`
   - `signal_text`
   - `evidence_text` span (verbatim from the document)
   - provenance metadata (page/section/paragraph)
4. Store as JSONL for repeatable evaluation.

## Local evaluation script

This repo includes a lightweight evaluator that compares exported signals against gold labels.

- Gold labels example: [evaluation/gold_labels.example.json](../evaluation/gold_labels.example.json)
- Evaluator: [evaluation/evaluate.py](../evaluation/evaluate.py)

Run:

```bash
python evaluation/evaluate.py --gold evaluation/gold_labels.example.json --pred outputs/example_enterprise_output.json
```

Notes:
- Matching is currently strict on `(document_id, signal_type, normalized signal_text)`.
- Evidence-support accuracy is approximated by token overlap between gold and predicted `evidence_text` for matched signals.

## Metrics

### Precision
$\text{precision} = \frac{TP}{TP + FP}$

Interpretation: of the extracted signals, how many are correct.

### Recall
$\text{recall} = \frac{TP}{TP + FN}$

Interpretation: of the true signals, how many are found.

### F1
$F1 = 2 \cdot \frac{\text{precision}\cdot\text{recall}}{\text{precision}+\text{recall}}$

### Hallucination rate
Even without an LLM, this is useful when adding a future generative extractor.

Definition (one possible operationalization):
- A signal is "hallucinated" if its `signal_text` cannot be supported by `evidence_text`.

$\text{hallucination rate} = \frac{\#\text{unsupported signals}}{\#\text{all extracted signals}}$

### Evidence-support accuracy
Because evidence is a core product requirement:
- Evidence-support accuracy = % of signals where the reviewer agrees the evidence snippet truly supports the signal.

## Practical evaluation workflow
- Run pipeline on labeled docs.
- Normalize both predicted and gold signals into comparable keys.
- Use matching rules:
  - exact match on `signal_type`
  - fuzzy overlap on `evidence_text` (e.g., token Jaccard overlap threshold)
- Report metrics per signal type and overall.

## What to track over time
- precision/recall/F1 by signal type
- review rate (how many signals are flagged)
- evidence-support accuracy
- latency per document and throughput
