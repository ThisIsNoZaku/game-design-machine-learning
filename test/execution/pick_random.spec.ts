import {pick_random} from "../../src/execution/pick";

describe("pick_random", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("returns a shuffled sample without replacement", () => {
        jest.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0);

        const options = ["A", "B", "C", "D"];

        expect(pick_random(options, 2)).toEqual(["B", "C"]);
        expect(options).toEqual(["A", "B", "C", "D"]);
    });

    it("allows repeated picks when replacement is enabled", () => {
        jest.spyOn(Math, "random")
            .mockReturnValueOnce(0.9)
            .mockReturnValueOnce(0.9)
            .mockReturnValueOnce(0.1);

        expect(pick_random(["A", "B", "C"], 3, true)).toEqual(["C", "C", "A"]);
    });

    it("returns an empty list when asked to pick nothing", () => {
        expect(pick_random(["A", "B", "C"], 0)).toEqual([]);
    });
});
