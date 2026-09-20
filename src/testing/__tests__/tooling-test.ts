import { render } from '@testing-library/react-native';
import { createElement } from 'react';
import { Text } from 'react-native';

describe('test tooling', () => {
  it('renders a React Native component with the Expo Jest preset', async () => {
    const { getByText } = await render(createElement(Text, null, 'Tooling is ready'));

    expect(getByText('Tooling is ready')).toBeTruthy();
  });
});
