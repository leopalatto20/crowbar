# Progressive Gym Adapters Intent

Status: Confirmed
Confirmed: 2026-09-19

## Intent

- **Outcome:** One active routine containing ordered workouts, with exercises prescribing target sets, rep ranges, and RIR/RPE, usable unchanged across gyms.
- **User:** The product owner's training workflow is the primary source of truth; other advanced multi-gym lifters validate that the workflow generalizes.
- **Why now:** Switching gyms fragments equipment-specific history even though the routine and exercises remain the same.
- **Success:** The trainee selects a workout, explicitly selects today's gym, and sees history for that exercise's default equipment context at that gym.
- **Constraint:** Equipment requires only a memorable trainee-written label such as "Hoist Incline Press." Trust the trainee's memory rather than requiring catalogs, photos, or detailed setup.
- **Out of scope:** Multiple active routines, automatic gym or location selection, automatic default promotion, and detailed equipment metadata.

## Resolved Product Decisions

- A routine contains ordered workouts. Each workout contains exercises with target sets, rep ranges, and RIR or RPE effort targets.
- The validation build needs one active routine. The same exercises remain in the routine when the trainee changes gyms.
- After choosing a workout, the trainee explicitly chooses the gym from a list. Crowbar does not infer or preselect the gym.
- A high-level custom equipment label is sufficient for recognizing a context later.
- An exercise can have multiple learned equipment contexts within one gym.
- Using substitute equipment is a one-session choice. Crowbar remembers the equipment without replacing the existing default.
- Defaults change only through an easily accessible, explicit "Make default" action. Repeated use never promotes equipment automatically.
