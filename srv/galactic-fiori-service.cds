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
  firstName
    @Core.Immutable
    @mandatory;

  lastName
    @Core.Immutable
    @mandatory;

  email
    @Core.Immutable
    @mandatory;

  originPlanet
    @Core.Immutable
    @mandatory;

  position
    @Core.Immutable
    @mandatory;

  stardustCollection
    @mandatory;

  stardustCollectionStatus
    @readonly;

  wormholeNavigationSkill
    @Core.Immutable
    @mandatory;

  navigationRank
    @readonly;

  spacesuitColor
    @mandatory;
};