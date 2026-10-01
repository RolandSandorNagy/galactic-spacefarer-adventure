using { galactic.spacefarer as db } from '../db/schema';

@path: '/galactic-ui'
@requires: 'authenticated-user'
service GalacticFioriService {
  @odata.draft.enabled
  @restrict: [
    {
      grant: 'READ',
      to: [
        'SpacefarerViewer',
        'SpacefarerManager'
      ],
      where: 'originPlanet.code = $user.allowedPlanet'
    },
    {
      grant: 'WRITE',
      to: 'SpacefarerManager',
      where: 'originPlanet.code = $user.allowedPlanet'
    },
    {
      grant: '*',
      to: 'SpacefarerAdmin'
    }
  ]
  entity SpaceFarers as projection on db.SpaceFarers;

  @readonly
  entity Planets as projection on db.Planets;

  @readonly
  entity Departments as projection on db.Departments;

  @readonly
  entity Positions as projection on db.Positions;

  @readonly
  entity SpacesuitColors as projection on db.SpacesuitColors;
}

annotate GalacticFioriService.SpaceFarers with {
  // New drafts are filled through PATCH; Core.Immutable would discard that input.
  // Existing records remain read-only here and are protected by the service handlers.
  // FieldControl values: 1 = ReadOnly, 7 = Mandatory.
  firstName
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  lastName
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  email
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  originPlanet
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  position
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  stardustCollection
    @mandatory;

  stardustCollectionStatus
    @readonly;

  wormholeNavigationSkill
    @Common.FieldControl: { $edmJson: { $If: [
      { $Or: [{ $Path: 'IsActiveEntity' }, { $Path: 'HasActiveEntity' }] },
      1,
      7
    ] } }
    @mandatory;

  navigationRank
    @readonly;

  spacesuitColor
    @mandatory;
};
