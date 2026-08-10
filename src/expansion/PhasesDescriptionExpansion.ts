import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {PhaseNode} from "../definitions/PhaseNode";
import {Phases} from "../definitions/Phases";
import {PhasesDescription} from "../descriptions/PhasesDescription";
import {PhaseNodeDescriptionExpansion} from "./PhaseNodeDescriptionExpansion";

export class PhasesDescriptionExpansion implements DescriptionToDefinitionTransformer<PhasesDescription, Phases> {
    private readonly nodeExpansion = new PhaseNodeDescriptionExpansion();

    transform(input: PhasesDescription): Phases {
        const expandedNodes = Object.entries(input.nodes).reduce<Record<string, PhaseNode>>((acc, [id, node]) => {
            acc[id] = this.nodeExpansion.transform(node);
            return acc;
        }, {});
        return new Phases(input.initial, expandedNodes);
    }
}
