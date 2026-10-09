import {Alert, Linking} from 'react-native';
import {
  openPrivacyPolicy,
  openSupportEmail,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
} from '../legalLinks';

describe('external legal and support links', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the published Privacy Policy', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await openPrivacyPolicy();

    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows the policy URL when the browser cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await openPrivacyPolicy();

    expect(alert).toHaveBeenCalledWith(
      'Unable to open Privacy Policy',
      expect.stringContaining(PRIVACY_POLICY_URL),
    );
  });

  it('keeps the rider support subject and uses the published contact', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openSupportEmail('Flux Rider Support');
    expect(openURL).toHaveBeenCalledWith(
      `mailto:${SUPPORT_EMAIL}?subject=Flux%20Rider%20Support`,
    );
  });

  it('shows the support address if no email app can open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no email app'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await openSupportEmail('Flux Rider Support');
    expect(alert).toHaveBeenCalledWith('Support', `Email ${SUPPORT_EMAIL}`);
  });
});
