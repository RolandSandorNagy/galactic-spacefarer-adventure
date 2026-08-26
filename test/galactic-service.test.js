import cds from '@sap/cds';
import { readFile } from 'node:fs/promises';

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

beforeEach(data.reset);

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