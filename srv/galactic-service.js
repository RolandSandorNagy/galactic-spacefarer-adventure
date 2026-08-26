import cds from '@sap/cds';

export default class GalacticService extends cds.ApplicationService {
  init() {
    const { SpaceFarers } = this.entities;

    this.before(
      ['CREATE', 'UPDATE'],
      SpaceFarers,
      enforceAllowedPlanet
    );

    return super.init();
  }
}

function enforceAllowedPlanet(req) {
  if (req.user.is('SpacefarerAdmin')) {
    return;
  }

  const requestedPlanet = req.data.originPlanet_code;

  // If an UPDATE does not change the planet, the declarative
  // instance restriction still protects the existing record.
  if (!requestedPlanet) {
    return;
  }

  const userAttribute = req.user.attr.allowedPlanet;
  const allowedPlanets = Array.isArray(userAttribute)
    ? userAttribute
    : [userAttribute].filter(Boolean);

  if (!allowedPlanets.includes(requestedPlanet)) {
    req.reject(
      403,
      'You are not authorized to assign spacefarers to this planet.'
    );
  }
}