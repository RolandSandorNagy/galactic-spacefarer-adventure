using GalacticFioriService as service
  from '../../srv/galactic-fiori-service';

annotate service.SpaceFarers with @(
    UI.HeaderInfo : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Spacefarer',
        TypeNamePlural : 'Spacefarers',
        Title          : {
            $Type : 'UI.DataField',
            Value : firstName,
        },
        Description    : {
            $Type : 'UI.DataField',
            Value : lastName,
        },
    },

    UI.SelectionFields : [
        originPlanet_code,
        position_code,
        stardustCollectionStatus,
        navigationRank,
        spacesuitColor_code,
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'First Name',
            Value : firstName,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Last Name',
            Value : lastName,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Origin Planet',
            Value : originPlanet.name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Stardust Collection',
            Value : stardustCollection,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Stardust Status',
            Value : stardustCollectionStatus,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Spacesuit Color',
            Value : spacesuitColor.name,
        },
    ],

    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            {
                $Type : 'UI.DataField',
                Label : 'First Name',
                Value : firstName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Last Name',
                Value : lastName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Email',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Origin Planet',
                Value : originPlanet_code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Position',
                Value : position_code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Stardust Collection',
                Value : stardustCollection,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Stardust Status',
                Value : stardustCollectionStatus,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Wormhole Navigation Skill',
                Value : wormholeNavigationSkill,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Navigation Rank',
                Value : navigationRank,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Spacesuit Color',
                Value : spacesuitColor_code,
            },
        ],
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInformation',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation',
        },
    ],
);

annotate service.SpaceFarers with @(
    Capabilities.InsertRestrictions : {
        Insertable : false,
    },
    Capabilities.UpdateRestrictions : {
        Updatable : true,
    },
);

annotate service.SpaceFarers with {
    firstName
        @Common.Label : 'First Name';

    lastName
        @Common.Label : 'Last Name';

    email
        @Common.Label : 'Email';

    originPlanet
        @Common.Label : 'Origin Planet';

    position
        @Common.Label : 'Position';

    stardustCollection
        @Common.Label : 'Stardust Collection';

    stardustCollectionStatus
        @Common.Label : 'Stardust Status';

    wormholeNavigationSkill
        @Common.Label : 'Wormhole Navigation Skill';

    navigationRank
        @Common.Label : 'Navigation Rank';

    spacesuitColor
        @Common.Label : 'Spacesuit Color';
};
