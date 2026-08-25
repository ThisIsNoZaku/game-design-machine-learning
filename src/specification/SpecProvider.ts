import {FeatureSpec} from "./ModelSpecs";

/**
 * Interface for a provider of a spec object.
 */
export default interface SpecProvider {

    spec(): Promise<FeatureSpec>;
}