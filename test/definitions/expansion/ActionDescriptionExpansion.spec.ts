import {ActionDescription} from "../../../src/descriptions/GameDescription";
import {ActionDescriptionExpansion} from "../../../src/expansion";
import {Effect} from "../../../src/definitions/Effect";
import {EffectActionStep} from "../../../src/definitions/EffectActionStep";

describe("Action Description Expansion", () => {
    it("expands a description into a definition ", () => {
        const description:ActionDescription = {
            id: "action"
        };
        expect(new ActionDescriptionExpansion().define(description)).toEqual({
            actor: "agent",
            id: "action",
            label: undefined,
            parameters: {},
            prerequisites: undefined,
            steps: {
                actionStep: new EffectActionStep(),
                children: []
            },
            tags: []
        });
    })
})