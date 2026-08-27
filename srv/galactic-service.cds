using { galactic.spacefarer as db } from '../db/schema';

@path: '/galactic'
@requires: 'authenticated-user'
service GalacticService {
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

annotate GalacticService.SpaceFarers with {
  stardustCollectionStatus @readonly;
  navigationRank @readonly;
};