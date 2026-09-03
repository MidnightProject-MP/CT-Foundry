# Foundry routing-policy bridge

This capability is the Foundry-side, post-Observer boundary for learning a
bounded model-routing preference. `deriveRoutingPolicyCandidate` accepts only
the durable semantic observation projection and an explicit classification; it
copies no observation text or runtime telemetry. Candidates are deterministic,
review-required, and retain claim IDs plus observation provenance.

`RoutingPolicyStore` stores observations, candidates, consolidations, and
reviews (with an embedded future signal) as immutable content-addressed JSON
under a caller-owned root. Accepted signals use exactly
`celestan-future-routing-signal-v1` and `status: "active"`; they are derived
from accepted reviews. The Observer policy decision API remains intentionally
unable to accept routing changes. Signals
become inactive only through explicit valid supersession. The store requires an
explicit non-empty `authorizedReviewerIds` option and validates artifacts and
filename bindings on every read. Rehabilitation uses a
`restore-default` signal that explicitly supersedes a negative signal; narrow
project exceptions use `supersessionMode: "narrow"`.

Foundry subjects use the same provider-qualified `provider/model` identity as
Runtime. Durable claim IDs and labels are bounded to 160 characters; claim
statements and interpretations are bounded to 1000 characters. The store
checks the complete candidate/consolidation/review lineage, authorized
reviewers, and active supersession targets before accepting a signal.

```js
import { RoutingPolicyStore, deriveRoutingPolicyCandidate,
  consolidateRoutingPolicyCandidates, createRoutingPolicyReview } from './routing-policy.mjs';
const store = new RoutingPolicyStore(root, { authorizedReviewerIds: ['reviewer-1'] });
const candidate = deriveRoutingPolicyCandidate(observation, proposal);
await store.appendObservation(observation);
await store.appendCandidate(candidate);
const consolidation = consolidateRoutingPolicyCandidates([candidate]);
await store.appendConsolidation(consolidation);
await store.appendReview(createRoutingPolicyReview(consolidation,
  consolidation.findings[0], reviewInput));
```
