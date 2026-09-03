import {LocationDescriptionExpansion} from "../../../src/expansion";
import {AreaDescription} from "../../../src/descriptions/LocationDescription";

describe("Location Description Expansion", () => {
    it("expands a grid location into child regions", () => {
        const description: AreaDescription = {
            shape: {
                rows: 2,
                cols: 2,
                state: {
                    occupied: false
                }
            }
        };

        expect(new LocationDescriptionExpansion().transform(description)).toEqual({
            id: "region",
            contains: [
                "region_0_0",
                "region_0_1",
                "region_1_0",
                "region_1_1"
            ],
            shape: {
                rows: 2,
                cols: 2,
                state: {
                    occupied: false
                }
            },
            subRegionShape: {
                rows: 2,
                cols: 2,
                state: {
                    occupied: false
                }
            },
            subregions: [
                {
                    id: "region_0_0",
                    contains: []
                },
                {
                    id: "region_0_1",
                    contains: []
                },
                {
                    id: "region_1_0",
                    contains: []
                },
                {
                    id: "region_1_1",
                    contains: []
                }
            ]
        });
    });
});
