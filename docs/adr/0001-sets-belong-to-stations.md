# Sets belong to Stations, and history always splits by Gym

Crowbar's premise is that the same lift is not comparable across gyms: machines differ in brand, leverage, and labelling. So every logged set belongs to a Station (one Exercise on specific equipment at one Gym), never directly to an Exercise, and history always splits by Gym, even for barbell lifts where 100 kg weighs the same everywhere. Stations are created implicitly on the first logged set and stay invisible until a Gym holds a second Station for the same Exercise, so the model costs nothing in the common case.

## Considered Options

- **Sets keyed by Exercise plus Gym**: cannot represent two different machines for the same Exercise at one Gym, or a machine replacement, without splitting the Exercise itself and losing Routine identity.
- **A per-Exercise "shared across Gyms" flag**: adds a mode the lifter must manage and makes the meaning of every progress view depend on it. A merged cross-Gym view, if wanted, is a read-side choice over Station data instead.
