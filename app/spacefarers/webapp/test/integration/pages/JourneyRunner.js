sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"galactic/spacefarer/spacefarers/test/integration/pages/SpaceFarersList.gen",
	"galactic/spacefarer/spacefarers/test/integration/pages/SpaceFarersObjectPage.gen"
], function (JourneyRunner, SpaceFarersListGenerated, SpaceFarersObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('galactic/spacefarer/spacefarers') + '/test/flp.html#app-preview',
        pages: {
			onTheSpaceFarersListGenerated: SpaceFarersListGenerated,
			onTheSpaceFarersObjectPageGenerated: SpaceFarersObjectPageGenerated
        },
        async: true
    });

    return runner;
});

