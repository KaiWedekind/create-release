import fs from 'node:fs';
import { getInput, setOutput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';

import { run } from '../src/create-release';

jest.mock('node:fs');
// Mock getInput and setFailed functions
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
}));

// Mock context and getOctokit functions
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'owner',
      repo: 'repo',
    },
  },
  getOctokit: jest.fn(),
}));

describe('Create Release', () => {
  let createRelease: jest.Mock;

  beforeEach(() => {
    // Mock the Octokit instance and the createRelease method
    createRelease = jest.fn().mockReturnValueOnce({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl',
      },
    });

    const mockOctokit = {
      rest: {
        repos: {
          createRelease: createRelease,
        },
      },
    };
    (getOctokit as jest.Mock).mockReturnValueOnce(mockOctokit);

    (context as any).repo = {
      owner: 'owner',
      repo: 'repo',
    };
    (context as any).sha = 'sha';

    // Clear all mock function calls and reset mock implementation
    jest.clearAllMocks();
  });

  it('Create release endpoint is called', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha',
    });
  });

  it('Draft release is created', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false,
      target_commitish: 'sha',
    });
  });

  it('Pre-release release is created', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: true,
      target_commitish: 'sha',
    });
  });

  it('Release with empty body is created', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha',
    });
  });

  it('Release body based on file', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('notes.md');

    fs.readFileSync = jest.fn().mockReturnValueOnce('# this is a release\nThe markdown is strong in this one.');

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '# this is a release\nThe markdown is strong in this one.',
      draft: false,
      prerelease: false,
      target_commitish: 'sha',
    });
  });

  it('Outputs are set', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    (setOutput as jest.Mock) = jest.fn();

    // Run the function
    await run();

    // Assertions
    expect(setOutput).toHaveBeenNthCalledWith(1, 'id', 'releaseId');
    expect(setOutput).toHaveBeenNthCalledWith(2, 'html_url', 'htmlUrl');
    expect(setOutput).toHaveBeenNthCalledWith(3, 'upload_url', 'uploadUrl');
  });

  it('Action fails elegantly', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease.mockRestore();
    createRelease.mockImplementation(() => {
      throw new Error('Error creating release');
    });

    (setOutput as jest.Mock) = jest.fn();

    (setFailed as jest.Mock) = jest.fn();

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledWith('Error creating release');
    expect(setOutput).toHaveBeenCalledTimes(0);
  });

  it('Should handle error and set failed', async () => {
    // Mock the return values for getInput
    (getInput as jest.Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('notes.md');

    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });

    // Run the function
    await run();

    // Assertions
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha',
    });

    expect(setFailed).toHaveBeenCalledWith('Test error');
  });
});
