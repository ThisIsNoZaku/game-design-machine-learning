import { ActionResolutionTree } from "../../src/model/ActionResolutionTree";
import { ActionStep } from "../../src/model/ActionStep";

describe("ActionResolutionTree", () => {
    const mockActionStep = (allowsChildren: boolean) => ({
        allowsMultipleChildren: allowsChildren,
    } as ActionStep);

    describe("constructor", () => {
        it("should initialize with valid actionStep and no children", () => {
            const actionStep = mockActionStep(true);
            const tree = new ActionResolutionTree(actionStep);

            expect(tree.actionStep).toBe(actionStep);
            expect(tree.children).toEqual([]);
        });

        it("should initialize with valid actionStep and children", () => {
            const actionStep = mockActionStep(true);
            const childTree = new ActionResolutionTree(mockActionStep(true));
            const tree = new ActionResolutionTree(actionStep, [childTree]);

            expect(tree.children).toHaveLength(1);
            expect(tree.children[0]).toBe(childTree);
        });

        it("should throw an error if actionStep does not allow children but children are provided", () => {
            const actionStep = mockActionStep(false);

            expect(() => {
                new ActionResolutionTree(actionStep, [new ActionResolutionTree(mockActionStep(true)), new ActionResolutionTree(mockActionStep(true))]);
            }).toThrow("This ActionStep does not allow more than one child");
        });
    });

    describe("canResolve", () => {
        it("should return false by default", () => {
            const actionStep = mockActionStep(true);
            const tree = new ActionResolutionTree(actionStep);

            expect(tree.canResolve({})).toBe(false);
        });
    });

    describe("resolve", () => {
        it("should return null by default", () => {
            const actionStep = mockActionStep(true);
            const tree = new ActionResolutionTree(actionStep);

            expect(tree.resolve({})).toBeNull();
        });
    });
});