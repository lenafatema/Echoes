# Two-minute ECHOES game demo

Start locally with `npm run dev` and open the Vite URL. Use the default Tech fest run; the demo does not depend on a daily modifier, a pre-earned campaign star, or a particular personal-best score.

| Time | Action and narration |
|---|---|
| **0:00–0:15** | Open **Choose a situation**. Point out campaign stars (`0 / 18` on a fresh profile), the first two unlocked scenarios, the star lock explanation on later scenarios, and the temporary **Free play** toggle. Mention that the engine's six worlds and scenario rules are unchanged. |
| **0:15–0:28** | Choose **College tech fest**. On Intro, read the actual mission: Readiness at least 55 and Morale at least 50 for the Mission star; Mastery additionally asks for Readiness 65 and Budget ₹57,000. Point out the starting measures and Begin. |
| **0:28–0:43** | On the first decision, hover or focus **Secure a replacement sponsor** to see a direction-only preview. Explain that Foresight can reveal these directions with a limited charge but does not predict exact values. Press **F** or select **Use Foresight** once; note the physical tool token and HUD count change. |
| **0:43–0:57** | Choose **Secure a replacement sponsor**. Drop the token on the stage or activate the option with Enter/Space. Show the recorded budget/readiness/morale changes and the actual follow-on event. |
| **0:57–1:08** | On the next decision, use **Rewind**. Point out that one charge is consumed and the exact pre-sponsor engine snapshot returns. Choose **Reduce the event scale** as the replacement first decision. |
| **1:08–1:25** | Finish Path A with **Secure a replacement sponsor**, then **Secure a replacement sponsor**. The result screen uses the engine's actual ending, final measures, evaluated stars, deterministic score, and configured rank. The demo path is valid; it does not promise three stars or a particular rank because Rewind/Foresight affect the unused-tool score component. |
| **1:25–1:42** | Use **Try the other path**. ECHOES enumerates valid engine continuations from an unchosen first decision and selects the completed result with the largest normalized metric difference. It is a separate path and starts with its own free exploration charges. Open **Compare paths** to see actual metric deltas and the two outcome labels. If this scenario's engine paths converge, the interface reports that without manufacturing a difference. |
| **1:42–1:52** | Open **Why did this happen?** briefly. Expand a rule record to show the actual recorded measure changes and reasons. Close it and select Path A or B to confirm branch navigation remains available. |
| **1:52–2:00** | Return to the campaign and expand **Run history**. Show the completed record: option sequence, tool log, stars, score, rank, completion date, and verified-replay state. If the displayed score exceeds the saved best, the result will say **New personal best**; otherwise it correctly reports the existing best/tie result. |

## Notes for a live demo

- If a scenario tile is locked, either earn a star in an earlier situation or turn on **Free play** for the demonstration. Free play does not change saved unlocks.
- You can skip the consequence reveal by clicking its page or pressing Space. Reduced motion can be toggled in the top bar; `?static=1` is the WebGL-free equivalent.
- The Decision Clock is off by default and is not part of this script.
- A personal best is profile-dependent. Do not claim one is new unless the Result screen actually announces it.
