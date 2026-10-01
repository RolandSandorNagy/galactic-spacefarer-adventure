import cds from '@sap/cds';
import { readFile } from 'node:fs/promises';

import { mock } from 'node:test';
import {
  CosmicNotificationService,
  cosmicNotificationService
} from '../srv/cosmic-notification-service.js';

const {
  GET,
  POST,
  PATCH,
  DELETE,
  expect,
  data
} = cds.test(import.meta.dirname + '/..');

const serviceUrl = '/galactic';
const testSpacefarerId = '77777777-7777-4777-8777-777777777777';

const readFixture = async fileName => {
  const fileUrl = new URL(`./fixtures/${fileName}`, import.meta.url);
  const content = await readFile(fileUrl, 'utf8');

  return JSON.parse(content);
};

const [
  planetXSpacefarer,
  changeToPlanetY,
  changeSpacesuitColor
] = await Promise.all([
  readFixture('planet-x-spacefarer.json'),
  readFixture('change-to-planet-y.json'),
  readFixture('change-spacesuit-color.json')
]);

const requestConfig = (username, password = 'test') => ({
  auth: {
    username,
    password
  },
  validateStatus: () => true
});

const waitFor = async (predicate, { timeout = 1000, interval = 10 } = {}) => {
  const deadline = Date.now() + timeout;

  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('waitFor: condition not met within timeout');
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

const fioriServiceUrl = '/galactic-ui';

beforeEach(data.reset);

// Never use SMTP during integration tests, even if the shell has SMTP settings.
// Notification tests install their own observable implementation on top.
beforeEach(() => {
  mock.method(
    cosmicNotificationService,
    'sendWelcomeEmail',
    async () => ({ messageId: 'integration-test-message' })
  );
});

afterEach(() => {
  mock.restoreAll();
});

describe('GalacticService authentication', () => {
  it('rejects invalid credentials', async () => {
    const response = await GET(
      `${serviceUrl}/SpaceFarers`,
      requestConfig('unknown', 'wrong')
    );

    expect(response.status).to.equal(401);
  });
});

describe('GalacticService read authorization', () => {
  it('allows a Planet X viewer to read only Planet X spacefarers', async () => {
    const response = await GET(
      `${serviceUrl}/SpaceFarers`,
      requestConfig('planet-x-viewer')
    );

    expect(response.status).to.equal(200);
    expect(response.data.value).to.have.length(1);
    expect(response.data.value[0].originPlanet_code).to.equal('PLANET_X');
  });

  it('allows a Planet Y viewer to read only Planet Y spacefarers', async () => {
    const response = await GET(
      `${serviceUrl}/SpaceFarers`,
      requestConfig('planet-y-viewer')
    );

    expect(response.status).to.equal(200);
    expect(response.data.value).to.have.length(1);
    expect(response.data.value[0].originPlanet_code).to.equal('PLANET_Y');
  });

  it('allows an administrator to read every spacefarer', async () => {
    const response = await GET(
      `${serviceUrl}/SpaceFarers`,
      requestConfig('galactic-admin')
    );

    expect(response.status).to.equal(200);
    expect(response.data.value).to.have.length(6);
  });
});

describe('GalacticService create authorization', () => {
  it('prevents a viewer from creating a spacefarer', async () => {
    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-viewer')
    );

    expect(response.status).to.equal(403);
  });

  it('prevents a Planet Y manager from creating a Planet X spacefarer', async () => {
    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-y-manager')
    );

    expect(response.status).to.equal(403);
  });

  it('allows a Planet X manager to create a Planet X spacefarer', async () => {
    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(201);
    expect(response.data.originPlanet_code).to.equal('PLANET_X');
    expect(response.data.createdBy).to.equal('planet-x-manager');
  });
});

describe('GalacticService update authorization', () => {
  it('prevents a Planet X manager from moving a record to Planet Y', async () => {
    await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    const updateResponse = await PATCH(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      structuredClone(changeToPlanetY),
      requestConfig('planet-x-manager')
    );

    expect(updateResponse.status).to.equal(403);

    const readResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.data.originPlanet_code).to.equal('PLANET_X');
  });

  it('prevents a Planet Y manager from modifying a Planet X record', async () => {
    const response = await PATCH(
      `${serviceUrl}/SpaceFarers(44444444-4444-4444-8444-444444444444)`,
      structuredClone(changeSpacesuitColor),
      requestConfig('planet-y-manager')
    );

    expect(response.status).to.equal(403);
  });

  it('allows a Planet X manager to modify a Planet X record', async () => {
    await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    const updateResponse = await PATCH(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      structuredClone(changeSpacesuitColor),
      requestConfig('planet-x-manager')
    );

    expect([200, 204]).to.include(updateResponse.status);

    const readResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.data.spacesuitColor_code).to.equal('RED');
    expect(readResponse.data.modifiedBy).to.equal('planet-x-manager');
  });
});

describe('GalacticService delete authorization', () => {
  it('prevents a viewer from deleting a spacefarer', async () => {
    const response = await DELETE(
      `${serviceUrl}/SpaceFarers(44444444-4444-4444-8444-444444444444)`,
      requestConfig('planet-x-viewer')
    );

    expect(response.status).to.equal(403);
  });

  it('prevents a Planet Y manager from deleting a Planet X record', async () => {
    const response = await DELETE(
      `${serviceUrl}/SpaceFarers(44444444-4444-4444-8444-444444444444)`,
      requestConfig('planet-y-manager')
    );

    expect(response.status).to.equal(403);
  });

  it('allows a Planet X manager to delete a Planet X record', async () => {
    const deleteResponse = await DELETE(
      `${serviceUrl}/SpaceFarers(44444444-4444-4444-8444-444444444444)`,
      requestConfig('planet-x-manager')
    );

    expect(deleteResponse.status).to.equal(204);

    const readResponse = await GET(
      `${serviceUrl}/SpaceFarers(44444444-4444-4444-8444-444444444444)`,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.status).to.equal(404);
  });
});

describe('GalacticService reference data', () => {
  it('allows authenticated users to read planets', async () => {
    const response = await GET(
      `${serviceUrl}/Planets`,
      requestConfig('planet-x-viewer')
    );

    expect(response.status).to.equal(200);
    expect(response.data.value.length).to.be.greaterThan(0);
  });

  it('prevents administrators from creating reference data', async () => {
    const response = await POST(
      `${serviceUrl}/Planets`,
      {
        code: 'PLUTO',
        name: 'Pluto'
      },
      requestConfig('galactic-admin')
    );

    expect(response.status).to.equal(405);
  });
});

describe('GalacticService cosmic preparation', () => {
  const stardustCases = [
    { value: 0, expected: 'LOW' },
    { value: 999, expected: 'LOW' },
    { value: 1000, expected: 'READY' },
    { value: 4999, expected: 'READY' },
    { value: 5000, expected: 'ELITE' }
  ];

  for (const testCase of stardustCases) {
    it(
      `assigns ${testCase.expected} for ${testCase.value} stardust`,
      async () => {
        const payload = structuredClone(planetXSpacefarer);
        payload.stardustCollection = testCase.value;

        // Deliberately submit an incorrect value to prove that
        // the backend calculates the status itself.
        payload.stardustCollectionStatus = 'ELITE';

        const response = await POST(
          `${serviceUrl}/SpaceFarers`,
          payload,
          requestConfig('planet-x-manager')
        );

        expect(response.status).to.equal(201);
        expect(response.data.stardustCollectionStatus)
          .to.equal(testCase.expected);
      }
    );
  }

  const navigationCases = [
    { value: 0, expected: 'NOVICE' },
    { value: 49, expected: 'NOVICE' },
    { value: 50, expected: 'SKILLED' },
    { value: 69, expected: 'SKILLED' },
    { value: 70, expected: 'EXPERT' },
    { value: 89, expected: 'EXPERT' },
    { value: 90, expected: 'MASTER' },
    { value: 100, expected: 'MASTER' }
  ];

  for (const testCase of navigationCases) {
    it(
      `assigns ${testCase.expected} for navigation skill ${testCase.value}`,
      async () => {
        const payload = structuredClone(planetXSpacefarer);
        payload.wormholeNavigationSkill = testCase.value;

        // Deliberately submit an incorrect value.
        payload.navigationRank = 'MASTER';

        const response = await POST(
          `${serviceUrl}/SpaceFarers`,
          payload,
          requestConfig('planet-x-manager')
        );

        expect(response.status).to.equal(201);
        expect(response.data.navigationRank).to.equal(testCase.expected);
      }
    );
  }

  it('rejects a negative stardust collection', async () => {
    const payload = structuredClone(planetXSpacefarer);
    payload.stardustCollection = -1;

    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      payload,
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(400);
  });

  it('rejects navigation skill below zero', async () => {
    const payload = structuredClone(planetXSpacefarer);
    payload.wormholeNavigationSkill = -1;

    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      payload,
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(400);
  });

  it('rejects navigation skill above one hundred', async () => {
    const payload = structuredClone(planetXSpacefarer);
    payload.wormholeNavigationSkill = 101;

    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      payload,
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(400);
  });

  it('recalculates cosmic values after a relevant update', async () => {
    await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    const updateResponse = await PATCH(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      {
        stardustCollection: 5000,
        wormholeNavigationSkill: 90
      },
      requestConfig('planet-x-manager')
    );

    expect([200, 204]).to.include(updateResponse.status);

    const readResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.data.stardustCollectionStatus).to.equal('ELITE');
    expect(readResponse.data.navigationRank).to.equal('MASTER');
  });

  it('prevents clients from directly changing calculated cosmic values', async () => {
    await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    const originalResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    const updateResponse = await PATCH(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      {
        stardustCollectionStatus: 'ELITE',
        navigationRank: 'MASTER'
      },
      requestConfig('planet-x-manager')
    );

    expect([200, 204]).to.include(updateResponse.status);

    const updatedResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    expect(updatedResponse.data.stardustCollectionStatus)
      .to.equal(originalResponse.data.stardustCollectionStatus);

    expect(updatedResponse.data.navigationRank)
      .to.equal(originalResponse.data.navigationRank);
    });
});

describe('GalacticService cosmic notifications', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('triggers a welcome email after successful creation', async () => {
    const sendWelcomeEmail = mock.method(
      cosmicNotificationService,
      'sendWelcomeEmail',
      async () => ({ messageId: 'test-message' })
    );

    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(201);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(1);

    const createdSpacefarer =
      sendWelcomeEmail.mock.calls[0].arguments[0];

    expect(createdSpacefarer.email).to.equal(planetXSpacefarer.email);
    expect(createdSpacefarer.stardustCollectionStatus)
      .to.equal(response.data.stardustCollectionStatus);
    expect(createdSpacefarer.navigationRank)
      .to.equal(response.data.navigationRank);
  });

  it('does not trigger an email when creation is rejected', async () => {
    const sendWelcomeEmail = mock.method(
      cosmicNotificationService,
      'sendWelcomeEmail',
      async () => ({ messageId: 'test-message' })
    );

    const payload = structuredClone(planetXSpacefarer);
    payload.wormholeNavigationSkill = 101;

    const response = await POST(
      `${serviceUrl}/SpaceFarers`,
      payload,
      requestConfig('planet-x-manager')
    );

    expect(response.status).to.equal(400);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });

  it('builds the congratulatory email with the correct recipient and content', async () => {
    const sendMail = mock.fn(async () => ({
      messageId: 'test-message'
    }));

    const notificationService =
      new CosmicNotificationService({ sendMail });

    await notificationService.sendWelcomeEmail({
      firstName: 'Nova',
      lastName: 'Starlight',
      email: 'nova.starlight@planet-x.example',
      stardustCollectionStatus: 'ELITE',
      navigationRank: 'MASTER'
    });

    expect(sendMail.mock.callCount()).to.equal(1);

    const message = sendMail.mock.calls[0].arguments[0];

    expect(message.to).to.equal(
      'nova.starlight@planet-x.example'
    );
    expect(message.subject).to.equal(
      'Welcome to your Galactic Spacefarer Adventure!'
    );
    expect(message.text).to.include('Dear Nova Starlight');
    expect(message.text).to.include('ELITE');
    expect(message.text).to.include('MASTER');
  });

  it('keeps the created spacefarer when email delivery fails', async () => {
    const sendWelcomeEmail = mock.method(
      cosmicNotificationService,
      'sendWelcomeEmail',
      async () => {
        throw new Error('SMTP service unavailable');
      }
    );

    const notificationLogger = cds.log('cosmic-notifications');
    const logError = mock.method(
      notificationLogger,
      'error',
      () => {}
    );

    const createResponse = await POST(
      `${serviceUrl}/SpaceFarers`,
      structuredClone(planetXSpacefarer),
      requestConfig('planet-x-manager')
    );

    expect(createResponse.status).to.equal(201);

    await waitFor(() => logError.mock.callCount() > 0);

    expect(sendWelcomeEmail.mock.callCount()).to.equal(1);
    expect(logError.mock.callCount()).to.equal(1);


    const readResponse = await GET(
      `${serviceUrl}/SpaceFarers(${testSpacefarerId})`,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.email).to.equal(
      planetXSpacefarer.email
    );
  });
});

describe('GalacticService list query behavior', () => {
  it('supports filtering, sorting and pagination together', async () => {
    const query = [
      '$filter=stardustCollectionStatus%20eq%20%27READY%27',
      '$orderby=stardustCollection%20asc',
      '$skip=1',
      '$top=2',
      '$count=true'
    ].join('&');

    const response = await GET(
      `${serviceUrl}/SpaceFarers?${query}`,
      requestConfig('galactic-admin')
    );

    expect(response.status).to.equal(200);
    expect(response.data['@odata.count']).to.equal(3);
    expect(response.data.value).to.have.length(2);

    expect(
      response.data.value.map(spacefarer =>
        spacefarer.stardustCollection
      )
    ).to.deep.equal([2700, 3400]);

    expect(
      response.data.value.every(spacefarer =>
        spacefarer.stardustCollectionStatus === 'READY'
      )
    ).to.equal(true);
  });
});

describe('GalacticFioriService draft lifecycle and authorization', () => {
  const planetXSpacefarerId =
    '44444444-4444-4444-8444-444444444444';

  const activeSpacefarerUrl =
    `${fioriServiceUrl}/SpaceFarers(` +
    `ID=${planetXSpacefarerId},IsActiveEntity=true)`;

  const draftSpacefarerUrl =
    `${fioriServiceUrl}/SpaceFarers(` +
    `ID=${planetXSpacefarerId},IsActiveEntity=false)`;

  it('edits and activates a spacefarer draft', async () => {
    const editResponse = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(editResponse.status);

    const patchResponse = await PATCH(
      draftSpacefarerUrl,
      {
        stardustCollection: 5000,
        spacesuitColor_code: 'RED'
      },
      requestConfig('galactic-admin')
    );

    expect([200, 204]).to.include(patchResponse.status);

    const activateResponse = await POST(
      `${draftSpacefarerUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(activateResponse.status);

    const readResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.stardustCollection).to.equal(5000);
    expect(readResponse.data.stardustCollectionStatus).to.equal('ELITE');
    expect(readResponse.data.spacesuitColor_code).to.equal('RED');
    expect(cosmicNotificationService.sendWelcomeEmail.mock.callCount())
      .to.equal(0);
  });

  it('prevents a viewer from starting draft editing', async () => {
    const response = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('planet-x-viewer')
    );

    expect([403, 404]).to.include(response.status);
  });

  it('prevents a Planet Y manager from editing a Planet X record', async () => {
    const response = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('planet-y-manager')
    );

    expect([403, 404]).to.include(response.status);
  });

  it('allows a Planet X manager to edit and activate a Planet X record', async () => {
    const editResponse = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('planet-x-manager')
    );

    expect([200, 201]).to.include(editResponse.status);

    const patchResponse = await PATCH(
      draftSpacefarerUrl,
      {
        stardustCollection: 1000,
        spacesuitColor_code: 'BLUE'
      },
      requestConfig('planet-x-manager')
    );

    expect([200, 204]).to.include(patchResponse.status);

    const activateResponse = await POST(
      `${draftSpacefarerUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('planet-x-manager')
    );

    expect([200, 201]).to.include(activateResponse.status);

    const readResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.stardustCollection).to.equal(1000);
    expect(readResponse.data.stardustCollectionStatus).to.equal('READY');
    expect(readResponse.data.spacesuitColor_code).to.equal('BLUE');
  });

  it('ignores changes to readonly fields in a draft', async () => {
    const originalResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(originalResponse.status).to.equal(200);

    const original = originalResponse.data;

    const editResponse = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(editResponse.status);

    const patchResponse = await PATCH(
      draftSpacefarerUrl,
      {
        HasActiveEntity: false,
        firstName: 'Spoofed',
        lastName: 'Candidate',
        email: 'spoofed@galactic.example',
        originPlanet_code: 'PLANET_Y',
        position_code: 'SPACE_PHYSICIAN',
        wormholeNavigationSkill: 100,
        navigationRank: 'MASTER',
        stardustCollectionStatus: 'ELITE'
      },
      requestConfig('galactic-admin')
    );

    expect([200, 204]).to.include(patchResponse.status);

    const activateResponse = await POST(
      `${draftSpacefarerUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(activateResponse.status);

    const updatedResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(updatedResponse.status).to.equal(200);
    expect(updatedResponse.data.firstName).to.equal(original.firstName);
    expect(updatedResponse.data.lastName).to.equal(original.lastName);
    expect(updatedResponse.data.email).to.equal(original.email);
    expect(updatedResponse.data.originPlanet_code)
      .to.equal(original.originPlanet_code);
    expect(updatedResponse.data.position_code).to.equal(original.position_code);
    expect(updatedResponse.data.wormholeNavigationSkill)
      .to.equal(original.wormholeNavigationSkill);
    expect(updatedResponse.data.navigationRank)
      .to.equal(original.navigationRank);
    expect(updatedResponse.data.stardustCollectionStatus)
      .to.equal(original.stardustCollectionStatus);
  });

  it('ignores immutable input on a direct active update through the Fiori service', async () => {
    const originalResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );
    expect(originalResponse.status).to.equal(200);

    const patchResponse = await PATCH(
      activeSpacefarerUrl,
      {
        firstName: 'Spoofed',
        originPlanet_code: 'PLANET_Y',
        wormholeNavigationSkill: 0,
        stardustCollection: 5000
      },
      requestConfig('galactic-admin')
    );
    expect([200, 204]).to.include(patchResponse.status);

    const updatedResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );
    expect(updatedResponse.status).to.equal(200);
    expect(updatedResponse.data.firstName)
      .to.equal(originalResponse.data.firstName);
    expect(updatedResponse.data.originPlanet_code)
      .to.equal(originalResponse.data.originPlanet_code);
    expect(updatedResponse.data.wormholeNavigationSkill)
      .to.equal(originalResponse.data.wormholeNavigationSkill);
    expect(updatedResponse.data.stardustCollection).to.equal(5000);
    expect(updatedResponse.data.stardustCollectionStatus).to.equal('ELITE');
  });

  it('does not activate a draft with invalid stardust', async () => {
    const originalResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(originalResponse.status).to.equal(200);

    const originalStardust =
      originalResponse.data.stardustCollection;

    const editResponse = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(editResponse.status);

    const patchResponse = await PATCH(
      draftSpacefarerUrl,
      {
        stardustCollection: -1
      },
      requestConfig('galactic-admin')
    );

    if (patchResponse.status < 400) {
      const activateResponse = await POST(
        `${draftSpacefarerUrl}/GalacticFioriService.draftActivate`,
        {},
        requestConfig('galactic-admin')
      );

      expect(activateResponse.status).to.equal(400);
    } else {
      expect(patchResponse.status).to.equal(400);
    }

    const activeResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(activeResponse.status).to.equal(200);
    expect(activeResponse.data.stardustCollection)
      .to.equal(originalStardust);
  });

  it('discards a draft without changing the active record', async () => {
    const originalResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(originalResponse.status).to.equal(200);

    const originalStardust =
      originalResponse.data.stardustCollection;

    const editResponse = await POST(
      `${activeSpacefarerUrl}/GalacticFioriService.draftEdit`,
      {
        PreserveChanges: false
      },
      requestConfig('galactic-admin')
    );

    expect([200, 201]).to.include(editResponse.status);

    const patchResponse = await PATCH(
      draftSpacefarerUrl,
      {
        stardustCollection: 5000
      },
      requestConfig('galactic-admin')
    );

    expect([200, 204]).to.include(patchResponse.status);

    const discardResponse = await DELETE(
      draftSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(discardResponse.status).to.equal(204);

    const activeResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('galactic-admin')
    );

    expect(activeResponse.status).to.equal(200);
    expect(activeResponse.data.stardustCollection)
      .to.equal(originalStardust);
  });

  it('prevents a viewer from deleting through the Fiori service', async () => {
    const response = await DELETE(
      activeSpacefarerUrl,
      requestConfig('planet-x-viewer')
    );

    expect([403, 404]).to.include(response.status);
  });

  it('prevents a Planet Y manager from deleting a Planet X record through the Fiori service', async () => {
    const response = await DELETE(
      activeSpacefarerUrl,
      requestConfig('planet-y-manager')
    );

    expect([403, 404]).to.include(response.status);
  });

  it('allows a Planet X manager to delete a Planet X record through the Fiori service', async () => {
    const deleteResponse = await DELETE(
      activeSpacefarerUrl,
      requestConfig('planet-x-manager')
    );

    expect(deleteResponse.status).to.equal(204);

    const readResponse = await GET(
      activeSpacefarerUrl,
      requestConfig('planet-x-manager')
    );

    expect(readResponse.status).to.equal(404);
  });
});

describe('GalacticFioriService new spacefarer drafts', () => {
  let sendWelcomeEmail;

  const entityUrl = (id, isActiveEntity = false) =>
    `${fioriServiceUrl}/SpaceFarers(` +
    `ID=${id},IsActiveEntity=${isActiveEntity})`;

  const creationData = (overrides = {}) => {
    const payload = structuredClone(planetXSpacefarer);
    delete payload.ID;

    return {
      ...payload,
      // Clients cannot choose the values calculated during activation.
      stardustCollectionStatus: 'ELITE',
      navigationRank: 'MASTER',
      ...overrides
    };
  };

  const startDraft = async (username = 'galactic-admin') => {
    const response = await POST(
      `${fioriServiceUrl}/SpaceFarers`,
      {},
      requestConfig(username)
    );

    expect(response.status).to.equal(201);
    expect(response.data.ID).to.be.a('string');
    expect(response.data.IsActiveEntity).to.equal(false);
    expect(response.data.HasActiveEntity).to.equal(false);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);

    return response.data.ID;
  };

  beforeEach(() => {
    sendWelcomeEmail = mock.method(
      cosmicNotificationService,
      'sendWelcomeEmail',
      async () => ({ messageId: 'draft-test-message' })
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  for (const username of ['galactic-admin', 'planet-x-manager']) {
    it(`creates, prepares and activates a new draft as ${username}`, async () => {
      const id = await startDraft(username);
      const draftUrl = entityUrl(id);

      const patchResponse = await PATCH(
        draftUrl,
        creationData(),
        requestConfig(username)
      );

      expect([200, 204]).to.include(patchResponse.status);
      expect(sendWelcomeEmail.mock.callCount()).to.equal(0);

      const prepareResponse = await POST(
        `${draftUrl}/GalacticFioriService.draftPrepare`,
        { SideEffectsQualifier: '' },
        requestConfig(username)
      );

      expect(prepareResponse.status).to.equal(200);
      expect(sendWelcomeEmail.mock.callCount()).to.equal(0);

      const beforeActivation = await GET(
        entityUrl(id, true),
        requestConfig('galactic-admin')
      );

      expect(beforeActivation.status).to.equal(404);

      const activateResponse = await POST(
        `${draftUrl}/GalacticFioriService.draftActivate`,
        {},
        requestConfig(username)
      );

      expect(activateResponse.status, JSON.stringify(activateResponse.data))
        .to.equal(201);
      expect(activateResponse.data.IsActiveEntity).to.equal(true);
      expect(sendWelcomeEmail.mock.callCount()).to.equal(1);

      const detailResponse = await GET(
        `${entityUrl(id, true)}?` +
        '$expand=originPlanet,position($expand=department),spacesuitColor',
        requestConfig(username)
      );

      expect(detailResponse.status).to.equal(200);
      expect(detailResponse.data.firstName).to.equal(planetXSpacefarer.firstName);
      expect(detailResponse.data.lastName).to.equal(planetXSpacefarer.lastName);
      expect(detailResponse.data.email).to.equal(planetXSpacefarer.email);
      expect(detailResponse.data.originPlanet.code).to.equal('PLANET_X');
      expect(detailResponse.data.position.code).to.equal('STARSHIP_PILOT');
      expect(detailResponse.data.position.department.code).to.be.a('string');
      expect(detailResponse.data.spacesuitColor.code).to.equal('BLUE');
      expect(detailResponse.data.wormholeNavigationSkill).to.equal(78);
      expect(detailResponse.data.stardustCollection).to.equal(2100);
      expect(detailResponse.data.stardustCollectionStatus).to.equal('READY');
      expect(detailResponse.data.navigationRank).to.equal('EXPERT');
      expect(detailResponse.data.createdBy).to.equal(username);

      const notification = sendWelcomeEmail.mock.calls[0].arguments[0];
      expect(notification.ID).to.equal(id);
      expect(notification.email).to.equal(planetXSpacefarer.email);
      expect(notification.stardustCollectionStatus).to.equal('READY');
      expect(notification.navigationRank).to.equal('EXPERT');

      const listResponse = await GET(
        `${fioriServiceUrl}/SpaceFarers?$filter=IsActiveEntity%20eq%20true`,
        requestConfig('planet-x-viewer')
      );

      expect(listResponse.status).to.equal(200);
      expect(listResponse.data.value.map(row => row.ID)).to.include(id);
      expect(listResponse.data.value.every(row =>
        row.originPlanet_code === 'PLANET_X'
      )).to.equal(true);

      const foreignListResponse = await GET(
        `${fioriServiceUrl}/SpaceFarers?$filter=IsActiveEntity%20eq%20true`,
        requestConfig('planet-y-viewer')
      );
      const foreignDetailResponse = await GET(
        entityUrl(id, true),
        requestConfig('planet-y-manager')
      );

      expect(foreignListResponse.status).to.equal(200);
      expect(foreignListResponse.data.value.map(row => row.ID)).not.to.include(id);
      expect([403, 404]).to.include(foreignDetailResponse.status);

      const removedDraft = await GET(draftUrl, requestConfig(username));
      expect(removedDraft.status).to.equal(404);
      expect(sendWelcomeEmail.mock.callCount()).to.equal(1);
    });
  }

  it('discards a populated new draft without a record or welcome email', async () => {
    const username = 'planet-x-manager';
    const id = await startDraft(username);
    const draftUrl = entityUrl(id);
    const patchResponse = await PATCH(
      draftUrl,
      creationData(),
      requestConfig(username)
    );

    expect([200, 204]).to.include(patchResponse.status);

    const discardResponse = await DELETE(draftUrl, requestConfig(username));
    expect(discardResponse.status).to.equal(204);

    for (const active of [false, true]) {
      const readResponse = await GET(
        entityUrl(id, active),
        requestConfig('galactic-admin')
      );
      expect(readResponse.status).to.equal(404);
    }

    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });

  const invalidCases = [
    { name: 'missing first name', data: { firstName: null }, target: 'firstName' },
    { name: 'blank last name', data: { lastName: '   ' }, target: 'lastName' },
    { name: 'invalid email', data: { email: 'not-an-email' }, target: 'email' },
    { name: 'missing planet', data: { originPlanet_code: null }, target: 'originPlanet' },
    { name: 'unknown position', data: { position_code: 'UNKNOWN' }, target: 'position' },
    { name: 'unknown color', data: { spacesuitColor_code: 'UNKNOWN' }, target: 'spacesuitColor' },
    { name: 'negative stardust', data: { stardustCollection: -1 }, target: 'stardustCollection' },
    { name: 'navigation out of range', data: { wormholeNavigationSkill: 101 }, target: 'wormholeNavigationSkill' }
  ];

  for (const testCase of invalidCases) {
    it(`does not activate or notify for ${testCase.name}`, async () => {
      const id = await startDraft();
      const draftUrl = entityUrl(id);
      const patchResponse = await PATCH(
        draftUrl,
        creationData(testCase.data),
        requestConfig('galactic-admin')
      );

      expect([200, 204, 400]).to.include(patchResponse.status);

      const activateResponse = await POST(
        `${draftUrl}/GalacticFioriService.draftActivate`,
        {},
        requestConfig('galactic-admin')
      );

      expect(activateResponse.status).to.equal(400);

      const validationResponse = patchResponse.status === 400
        ? patchResponse
        : activateResponse;
      const error = validationResponse.data.error;
      const messages = error.details ?? [error];

      expect(messages.some(message =>
        message.target?.includes(testCase.target) && message.message
      ), JSON.stringify(error)).to.equal(true);

      const activeResponse = await GET(
        entityUrl(id, true),
        requestConfig('galactic-admin')
      );

      expect(activeResponse.status).to.equal(404);
      expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
    });
  }

  it('keeps an incomplete draft editable after rejected activation', async () => {
    const id = await startDraft();
    const draftUrl = entityUrl(id);
    const activateResponse = await POST(
      `${draftUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('galactic-admin')
    );

    expect(activateResponse.status).to.equal(400);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);

    const patchResponse = await PATCH(
      draftUrl,
      creationData(),
      requestConfig('galactic-admin')
    );
    expect([200, 204]).to.include(patchResponse.status);

    const retryResponse = await POST(
      `${draftUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('galactic-admin')
    );
    expect(retryResponse.status).to.equal(201);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(1);
  });

  it('does not send a welcome email when a duplicate email rolls activation back', async () => {
    const id = await startDraft();
    const draftUrl = entityUrl(id);
    const patchResponse = await PATCH(
      draftUrl,
      creationData({ email: 'kael.zenith@galactic.example' }),
      requestConfig('galactic-admin')
    );
    expect([200, 204]).to.include(patchResponse.status);

    const activateResponse = await POST(
      `${draftUrl}/GalacticFioriService.draftActivate`,
      {},
      requestConfig('galactic-admin')
    );

    expect([400, 409], JSON.stringify(activateResponse.data))
      .to.include(activateResponse.status);
    expect(JSON.stringify(activateResponse.data.error))
      .to.match(/email|exists|unique|duplicate/i);
    expect(activateResponse.data.error.target).to.include('email');

    const activeResponse = await GET(
      entityUrl(id, true),
      requestConfig('galactic-admin')
    );
    const draftResponse = await GET(
      draftUrl,
      requestConfig('galactic-admin')
    );

    expect(activeResponse.status).to.equal(404);
    expect(draftResponse.status).to.equal(200);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });

  it('prevents a viewer from starting an empty or populated new draft', async () => {
    for (const payload of [{}, creationData()]) {
      const response = await POST(
        `${fioriServiceUrl}/SpaceFarers`,
        payload,
        requestConfig('planet-x-viewer')
      );
      expect(response.status).to.equal(403);
    }

    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });

  it('does not notify when a later operation rolls draft activation back', async () => {
    const createResponse = await POST(
      `${fioriServiceUrl}/SpaceFarers`,
      creationData(),
      requestConfig('galactic-admin')
    );
    expect(createResponse.status).to.equal(201);
    const id = createResponse.data.ID;
    const draftUrl = entityUrl(id);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);

    // The second operation runs only after activation succeeds, but both
    // operations belong to one transaction. Its failure must undo creation.
    const batchResponse = await POST(
      `${fioriServiceUrl}/$batch`,
      {
        requests: [
          {
            id: 'activate',
            atomicityGroup: 'save',
            method: 'POST',
            url: draftUrl.slice(fioriServiceUrl.length + 1) +
              '/GalacticFioriService.draftActivate',
            headers: { 'content-type': 'application/json' },
            body: {}
          },
          {
            id: 'fail',
            atomicityGroup: 'save',
            dependsOn: ['activate'],
            method: 'DELETE',
            url: 'SpaceFarers(' +
              'ID=00000000-0000-4000-8000-000000000000,IsActiveEntity=true)'
          }
        ]
      },
      requestConfig('galactic-admin')
    );

    expect(batchResponse.status).to.equal(200);
    const responses = batchResponse.data.responses;
    expect(responses.find(response => response.id === 'activate').status)
      .to.equal(201);
    expect(responses.find(response => response.id === 'fail').status)
      .to.equal(404);

    const activeResponse = await GET(
      entityUrl(id, true),
      requestConfig('galactic-admin')
    );
    const draftResponse = await GET(
      draftUrl,
      requestConfig('galactic-admin')
    );

    expect(activeResponse.status).to.equal(404);
    expect(draftResponse.status).to.equal(200);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });

  it('prevents a manager from assigning a foreign planet on draft creation or patch', async () => {
    const username = 'planet-x-manager';
    const foreignData = creationData({ originPlanet_code: 'PLANET_Y' });
    const createResponse = await POST(
      `${fioriServiceUrl}/SpaceFarers`,
      foreignData,
      requestConfig(username)
    );
    expect(createResponse.status).to.equal(403);

    const id = await startDraft(username);
    const patchResponse = await PATCH(
      entityUrl(id),
      foreignData,
      requestConfig(username)
    );
    expect(patchResponse.status).to.equal(403);

    const activeResponse = await GET(
      entityUrl(id, true),
      requestConfig('galactic-admin')
    );
    expect(activeResponse.status).to.equal(404);
    expect(sendWelcomeEmail.mock.callCount()).to.equal(0);
  });
});
