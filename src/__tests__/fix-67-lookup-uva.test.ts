/**
 * #67 — lookupUVA tells "the user has no UVA" apart from "could not check"
 *
 * Before creating a UVA, the registration form asks the backend whether the
 * user already has one. getUVA answers false both when there is none and when
 * the query fails, so a network error could lead to a second UVA. lookupUVA
 * (and the API's findUVAByUser) return 'found', 'none' or 'error', and the form
 * only creates on a confirmed 'none'. All data is synthetic.
 */

/* eslint-disable import/first */

const mockGraphql = jest.fn();
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: (...a: unknown[]) => mockGraphql(...a),
  }),
}));

const mockSetInfoField = jest.fn();
jest.mock('@/data/session/session', () => ({
  sessionService: {
    setInfoField: (...a: unknown[]) => mockSetInfoField(...a),
    getInfo: jest.fn().mockResolvedValue({}),
  },
}));

const mockGetRACIMO = jest.fn();
jest.mock('@/data/api/racimo-api', () => ({
  racimoAPIService: {
    getRACIMO: (...a: unknown[]) => mockGetRACIMO(...a),
    listRACIMOS: jest.fn(),
  },
}));

import { uvaAPIService } from '@/data/api/uva-api';
import { SetupRacimoService } from '@/domain/setup/setup-racimo';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const RACIMO_ID = '00000000-0000-4000-8000-000000000002';
const UVA_ID = 'UVA_ABC123_00000';

function itemsResponse(items: unknown[]) {
  return { data: { UVAbyUserID: { items } } };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  mockGetRACIMO.mockResolvedValue({
    success: true,
    data: { getRACIMO: { LinkageCode: 'ABC123' } },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('#67 — uvaAPIService.findUVAByUser', () => {
  it("returns 'found' with the data when the query returns items", async () => {
    mockGraphql.mockResolvedValue(
      itemsResponse([{ id: UVA_ID, racimoID: RACIMO_ID }]),
    );

    const result = await uvaAPIService.findUVAByUser({ userID: USER_ID });

    expect(result.status).toBe('found');
  });

  it("returns 'none' when the query answers with no items", async () => {
    mockGraphql.mockResolvedValue(itemsResponse([]));

    expect(await uvaAPIService.findUVAByUser({ userID: USER_ID })).toEqual({
      status: 'none',
    });
  });

  it("returns 'error' when the query answers with GraphQL errors", async () => {
    mockGraphql.mockResolvedValue({ errors: [{ message: 'Unauthorized' }] });

    const result = await uvaAPIService.findUVAByUser({ userID: USER_ID });

    expect(result.status).toBe('error');
  });

  it("returns 'error' when the request throws (no network)", async () => {
    mockGraphql.mockRejectedValue(new Error('Network request failed'));

    const result = await uvaAPIService.findUVAByUser({ userID: USER_ID });

    expect(result.status).toBe('error');
  });
});

describe('#67 — SetupRacimoService.lookupUVA', () => {
  it("'found': stores racimoID, uvaID and racimoLinkCode in session, like getUVA", async () => {
    mockGraphql.mockResolvedValue(
      itemsResponse([{ id: UVA_ID, racimoID: RACIMO_ID }]),
    );

    expect(await SetupRacimoService.lookupUVA(USER_ID)).toBe('found');
    expect(mockSetInfoField).toHaveBeenCalledWith('racimoID', RACIMO_ID);
    expect(mockSetInfoField).toHaveBeenCalledWith('uvaID', UVA_ID);
    expect(mockSetInfoField).toHaveBeenCalledWith('racimoLinkCode', 'ABC123');
  });

  it("'none': the user has no UVA and the session is not touched", async () => {
    mockGraphql.mockResolvedValue(itemsResponse([]));

    expect(await SetupRacimoService.lookupUVA(USER_ID)).toBe('none');
    expect(mockSetInfoField).not.toHaveBeenCalled();
  });

  it("'error' on a failed query, never 'none'", async () => {
    mockGraphql.mockRejectedValue(new Error('Network request failed'));

    expect(await SetupRacimoService.lookupUVA(USER_ID)).toBe('error');
    expect(mockSetInfoField).not.toHaveBeenCalled();
  });

  it("'error' when the item has no ids (it cannot be updated)", async () => {
    mockGraphql.mockResolvedValue(itemsResponse([{ id: null }]));

    expect(await SetupRacimoService.lookupUVA(USER_ID)).toBe('error');
  });

  it('getUVA keeps its original contract (false on error) for the other callers', async () => {
    mockGraphql.mockRejectedValue(new Error('Network request failed'));

    expect(await SetupRacimoService.getUVA(USER_ID)).toBe(false);
  });
});
