import cds from '@sap/cds';
import { cosmicNotificationService } from './cosmic-notification-service.js';

const STARDUST_READY_THRESHOLD = 1000;
const STARDUST_ELITE_THRESHOLD = 5000;

const NAVIGATION_SKILLED_THRESHOLD = 50;
const NAVIGATION_EXPERT_THRESHOLD = 70;
const NAVIGATION_MASTER_THRESHOLD = 90;
const NAVIGATION_MAXIMUM = 100;

export default class GalacticService extends cds.ApplicationService {
  init() {
    const { SpaceFarers } = this.entities;

    this.before(
      ['CREATE', 'UPDATE'],
      SpaceFarers,
      enforceAllowedPlanet
    );

    this.before(
      ['CREATE', 'UPDATE'],
      SpaceFarers,
      prepareForCosmicJourney
    );

    this.after(
      'CREATE',
      SpaceFarers,
      scheduleCosmicWelcomeNotification
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

function prepareForCosmicJourney(req) {
  enhanceStardustCollection(req);
  enhanceNavigationSkill(req);
}

function enhanceStardustCollection(req) {
  const stardust = req.data.stardustCollection;

  // Partial updates that do not modify stardust require no recalculation.
  if (stardust === undefined) {
    return;
  }

  if (!Number.isInteger(stardust) || stardust < 0) {
    req.reject(
      400,
      'Stardust collection must be a non-negative integer.',
      'stardustCollection'
    );
  }

  if (stardust >= STARDUST_ELITE_THRESHOLD) {
    req.data.stardustCollectionStatus = 'ELITE';
  } else if (stardust >= STARDUST_READY_THRESHOLD) {
    req.data.stardustCollectionStatus = 'READY';
  } else {
    req.data.stardustCollectionStatus = 'LOW';
  }
}

function enhanceNavigationSkill(req) {
  const navigationSkill = req.data.wormholeNavigationSkill;

  // Partial updates that do not modify navigation skill require no recalculation.
  if (navigationSkill === undefined) {
    return;
  }

  if (
    !Number.isInteger(navigationSkill) ||
    navigationSkill < 0 ||
    navigationSkill > NAVIGATION_MAXIMUM
  ) {
    req.reject(
      400,
      'Wormhole navigation skill must be an integer between 0 and 100.',
      'wormholeNavigationSkill'
    );
  }

  if (navigationSkill >= NAVIGATION_MASTER_THRESHOLD) {
    req.data.navigationRank = 'MASTER';
  } else if (navigationSkill >= NAVIGATION_EXPERT_THRESHOLD) {
    req.data.navigationRank = 'EXPERT';
  } else if (navigationSkill >= NAVIGATION_SKILLED_THRESHOLD) {
    req.data.navigationRank = 'SKILLED';
  } else {
    req.data.navigationRank = 'NOVICE';
  }
}

function scheduleCosmicWelcomeNotification(_result, req) {
  const createdSpacefarer = structuredClone(req.data);

  req.on('succeeded', () => {
    void sendCosmicWelcomeNotification(createdSpacefarer);
  });
}

async function sendCosmicWelcomeNotification(spacefarer) {
  try {
    await cosmicNotificationService.sendWelcomeEmail(spacefarer);
  } catch (error) {
    const logger = cds.log('cosmic-notifications');

    logger.error(
      'Failed to send cosmic welcome notification.',
      {
        spacefarerId: spacefarer.ID ?? 'unknown',
        error:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );
  }
}