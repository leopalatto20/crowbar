import { en } from "../../../i18n/locales/en";
import { es } from "../../../i18n/locales/es";
import {
  builtinExercises,
  validateBuiltinManifest,
} from "../data/builtin-exercises";

const expectedGroups = [
  ["chest", 8],
  ["upper-back", 6],
  ["lats", 6],
  ["shoulders", 6],
  ["biceps", 6],
  ["triceps", 6],
  ["forearms", 4],
  ["quads", 7],
  ["hamstrings", 5],
  ["glutes", 5],
  ["calves", 3],
  ["adductors", 3],
  ["core", 6],
  ["lower-back", 3],
] as const;

const expectedManifestEntries = [
  "chest:barbellBenchPress", "chest:inclineBarbellBenchPress", "chest:dumbbellBenchPress", "chest:inclineDumbbellBenchPress", "chest:chestPress", "chest:cableFly", "chest:pecDeck", "chest:pushUp",
  "upper-back:barbellRow", "upper-back:tBarRow", "upper-back:chestSupportedRow", "upper-back:seatedCableRow", "upper-back:machineRow", "upper-back:reverseFly",
  "lats:pullUp", "lats:chinUp", "lats:latPulldown", "lats:singleArmLatPulldown", "lats:straightArmPulldown", "lats:dumbbellPullover",
  "shoulders:barbellOverheadPress", "shoulders:dumbbellShoulderPress", "shoulders:machineShoulderPress", "shoulders:arnoldPress", "shoulders:dumbbellLateralRaise", "shoulders:cableLateralRaise",
  "biceps:barbellCurl", "biceps:dumbbellCurl", "biceps:inclineDumbbellCurl", "biceps:preacherCurl", "biceps:cableCurl", "biceps:hammerCurl",
  "triceps:cableTricepsPushdown", "triceps:overheadCableTricepsExtension", "triceps:dumbbellOverheadTricepsExtension", "triceps:skullCrusher", "triceps:closeGripBenchPress", "triceps:dip",
  "forearms:wristCurl", "forearms:reverseWristCurl", "forearms:reverseCurl", "forearms:farmersCarry",
  "quads:backSquat", "quads:frontSquat", "quads:legPress", "quads:hackSquat", "quads:legExtension", "quads:bulgarianSplitSquat", "quads:walkingLunge",
  "hamstrings:romanianDeadlift", "hamstrings:seatedLegCurl", "hamstrings:lyingLegCurl", "hamstrings:goodMorning", "hamstrings:nordicHamstringCurl",
  "glutes:barbellHipThrust", "glutes:gluteBridge", "glutes:cableGluteKickback", "glutes:stepUp", "glutes:hipAbductionMachine",
  "calves:standingCalfRaise", "calves:seatedCalfRaise", "calves:legPressCalfRaise",
  "adductors:hipAdductionMachine", "adductors:copenhagenPlank", "adductors:sumoSquat",
  "core:cableCrunch", "core:crunch", "core:hangingLegRaise", "core:reverseCrunch", "core:abWheelRollout", "core:plank",
  "lower-back:deadlift", "lower-back:backExtension", "lower-back:reverseHyperextension",
] as const;

const expectedBuiltinIds = [
  "586c64fe9bc836a14f3334b7065efbae", "768d3c900236d999213eddd506448f80", "3a9fe0e94f956152e71dd40ca0a7a83a", "73a7353b222d58e6a56f8430629761a2", "c168ef200c6d9f790d9ab14447afdf95", "edd2e104c7a7ff4c708bbcd020287e30", "40a90ecef93b68897e9ac817cf81810e", "735ad0e5fa25695834c585c74e860c42",
  "9734357e0e0a1b6a27a6ed6244661099", "df4066cc0cf268225191b1caf661c5c5", "7ee1bf94dfb7061735e2823b8a55b9af", "ba2699e935b6dcf3e5ad666e2cdf8efc", "88d2aa35a44e61501599f47eba42204f", "9d3a195eac23bcbc0497defd54cc86c6",
  "0b125b678156ec4cebe477af8a690636", "b1ce98a95ca668063e68b3b8d4343f3a", "978aec257456b95551a892216325fad9", "79b25ce8f000b106159402fa13f150b0", "ace27228e7fd42d04644628d45dd215f", "f13c0998c097becf8523213565cde85d",
  "ec1d391e1dbd9dd563b355b985253555", "de06bccb1f2ed8d4a4444648ec243ddf", "bfda14fd905fa7d66f448898779171c2", "f4e62ae5d67592ffd979976d9105bf61", "a43341093ab080858573880852271b19", "e3aacdb8a60eb4cb34a8722358d584ef",
  "45121e4414a95c365c1a6accf0c52916", "02fe244cb554a75edd4ba2b1f4e944fb", "2dc542461f9bd4f57a8dd1360df52e6b", "bf418a006dd25cda589201bfde22fb9e", "bc49ca0b2befeb62936e15276e64ae67", "6ca94bccdd6728e6233a4987581f83aa",
  "052b880f806f6fc1456219b9c3fbf2cc", "9ddb37a71e6661f0fdce0bd1f7cd23c0", "0e7de94bde5650c16cbebda3c5ca640a", "86264d6130e0c7fff8733d6cafda45da", "850fafe0c82b03d330221d546fac5393", "5d51413cf890676b1c3328c1783b44af",
  "4cef69882fc5276c94ef13428c2a8f79", "89fb32b0a1f709c61ab5d93a33ac8c2e", "6f2eff8223a690c1a23bafe25772e8ac", "29425e6e4982407e36ec05812d40a8d4", "1221f796dfc704d1337b524ec7690f96", "3268e1350b2696bc31713d781b5ec596",
  "587a87c5117976c0ce95222f550bfaa7", "8c91779a1a89e29441fae47437bc8211", "74f9e7573bf9223445514dcda4122bd5", "be538758e741e476ee350145714cce77", "fd3d1460e3bd7918071e4f2f8a12a7e2", "9a11edb3feaf58a13bc80c75c942463f",
  "15f95d66b48a959b940e14791dcec0aa", "3a99c3392d61b3f5be264fed698ce7c0", "58da93d125871a7b13ddd238782c3a2c", "2b4f4f01253f13880f4e6a3d0406b631", "1f27259e242bc5913ea8c67647a7049d",
  "9414ca8dc858da586d88fae952bfa774", "f1e27cd0fa7fc872a60b655e4b7c8392", "7f03222a35f816ae74bdd0ee22c148b6", "29785cd98d1bcb673f11cdd544565ee6", "7b6832c6bdf4196c4b141db30a07212e",
  "9480c45148a14ff3fe9742307e1c6358", "9464293ba9193f72c404271458d0334c", "dd5e3f0cbd971d60e9d4e4e577448be6", "8143caa65e38efb4425d1474dac7e6de", "c9940bfa8e25d679522ec173aff17351",
  "611ffa38889f1a93b7387ddb5f46d48e", "f3f8cc80ee45d1c3808439134083f5aa", "cb4285524436aec1bc564f1c5c6bbef1", "9f74610313ab53dac354962ed21bfada", "885194337d2e6ce7e9d2b8da6ab1d0f9",
  "19e097c6a39b41e548d402d70bb82b72", "179070fcff0d24b901524fe3ab851552", "775447c93b165ab73a9ec8e27e63afdf", "2ac9b64907a87aa2d65cd69e80f1d9a2",
] as const;

function translationAt(
  resource: typeof en,
  key: string,
): unknown {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, resource);
}

describe("builtin exercise manifest", () => {
  it("contains all 74 exercises in fixed muscle-group order", () => {
    expect(builtinExercises).toHaveLength(74);

    expect(
      builtinExercises.map(
        (exercise) => `${exercise.muscleGroup}:${exercise.translationKey.replace("exerciseCatalog.builtins.", "")}`,
      ),
    ).toEqual(expectedManifestEntries);
    expect(builtinExercises.map((exercise) => exercise.id)).toEqual(expectedBuiltinIds);

    let offset = 0;
    for (const [muscleGroup, count] of expectedGroups) {
      expect(
        builtinExercises.slice(offset, offset + count).every(
          (exercise) => exercise.muscleGroup === muscleGroup,
        ),
      ).toBe(true);
      offset += count;
    }

    expect(offset).toBe(builtinExercises.length);
  });

  it("uses unique valid opaque IDs and translation keys", () => {
    const ids = builtinExercises.map((exercise) => exercise.id);
    const keys = builtinExercises.map((exercise) => exercise.translationKey);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ids.every((id) => /^[0-9a-f]{32}$/.test(id))).toBe(true);
    expect(keys.every((key) => key.startsWith("exerciseCatalog.builtins."))).toBe(
      true,
    );
    expect(keys.every((key) => !ids.some((id) => String(id) === key))).toBe(true);
  });

  it("contains every built-in name in English and Spanish", () => {
    for (const exercise of builtinExercises) {
      expect(translationAt(en, exercise.translationKey)).toEqual(
        expect.stringMatching(/\S/),
      );
      expect(translationAt(es, exercise.translationKey)).toEqual(
        expect.stringMatching(/\S/),
      );
    }
  });

  it("validates the complete manifest and translation resources", () => {
    expect(validateBuiltinManifest(builtinExercises, en, es)).toEqual({ ok: true });
  });

  it("rejects a manifest with the wrong number of entries", () => {
    expect(validateBuiltinManifest(builtinExercises.slice(0, -1), en, es)).toEqual({
      ok: false,
      reason: "invalid-manifest",
    });
  });

  it("rejects an empty translation", () => {
    const english = {
      ...en,
      exerciseCatalog: {
        ...en.exerciseCatalog,
        builtins: { ...en.exerciseCatalog.builtins, barbellBenchPress: "  " },
      },
    };

    expect(validateBuiltinManifest(builtinExercises, english, es)).toEqual({
      ok: false,
      reason: "invalid-manifest",
    });
  });

  it.each([
    ["duplicate ID", (manifest: typeof builtinExercises) => [
      manifest[0],
      { ...manifest[1], id: manifest[0].id },
      ...manifest.slice(2),
    ]],
    ["invalid ID", (manifest: typeof builtinExercises) => [
      { ...manifest[0], id: "not-an-exercise-id" },
      ...manifest.slice(1),
    ]],
    ["changed valid ID", (manifest: typeof builtinExercises) => [
      { ...manifest[0], id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      ...manifest.slice(1),
    ]],
    ["invalid group", (manifest: typeof builtinExercises) => [
      { ...manifest[0], muscleGroup: "not-a-muscle-group" },
      ...manifest.slice(1),
    ]],
    ["missing translation", (manifest: typeof builtinExercises) => [
      { ...manifest[0], translationKey: "exerciseCatalog.builtins.missing" },
      ...manifest.slice(1),
    ]],
    ["altered membership", (manifest: typeof builtinExercises) => [
      { ...manifest[0], translationKey: manifest[1].translationKey },
      ...manifest.slice(1),
    ]],
    ["altered order", (manifest: typeof builtinExercises) => [
      manifest[1],
      manifest[0],
      ...manifest.slice(2),
    ]],
    ["missing Spanish resource", (manifest: typeof builtinExercises) => manifest],
  ] as const)("rejects %s", (name, mutate) => {
    const manifest = mutate(builtinExercises) as typeof builtinExercises;
    const spanish = name === "missing Spanish resource"
      ? { ...es, exerciseCatalog: {} }
      : es;

    expect(validateBuiltinManifest(manifest, en, spanish as typeof es)).toEqual({
      ok: false,
      reason: "invalid-manifest",
    });
  });
});
