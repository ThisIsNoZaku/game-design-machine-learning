import Selector from "../src/Selector";

describe("Selector", () => {
    it("returns all objects by default", () => {
        const selector = new Selector<{ type: string, value: number }>();
        const values = [
            { type: "a", value: 1 },
            { type: "b", value: 2 },
            { type: "c", value: 3 },
        ];
        expect(selector.select(values)).toEqual(values);
    });
});