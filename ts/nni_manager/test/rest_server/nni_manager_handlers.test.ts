// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

'use strict';

import { assert, expect } from 'chai';
import request from 'request';
import { Container } from 'typescript-ioc';

import * as component from '../../common/component';
import { DataStore } from '../../common/datastore';
import { ExperimentProfile, Manager } from '../../common/manager';
import { ExperimentManager } from '../../common/experimentManager'
import { TrainingService } from '../../common/trainingService';
import { cleanupUnitTest, prepareUnitTest } from '../../common/utils';
import { MockedDataStore } from '../mock/datastore';
import { MockedTrainingService } from '../mock/trainingService';
import { RestServer } from '../../rest_server';
import { testManagerProvider } from '../mock/nniManager';
import { testExperimentManagerProvider } from '../mock/experimentManager';
import { TensorboardManager } from '../../common/tensorboardManager';
import { NNITensorboardManager } from '../../core/nniTensorboardManager';

let restServer: RestServer;

describe('Unit test for rest server', () => {

    let ROOT_URL: string;

    before((done: Mocha.Done) => {
        prepareUnitTest();
        Container.bind(Manager).provider(testManagerProvider);
        Container.bind(DataStore).to(MockedDataStore);
        Container.bind(TrainingService).to(MockedTrainingService);
        Container.bind(ExperimentManager).provider(testExperimentManagerProvider);
        Container.bind(TensorboardManager).to(NNITensorboardManager);
        restServer = new RestServer(8080, '');
        restServer.start().then(() => {
            ROOT_URL = `http://localhost:8080/api/v1/nni`;
            done();
        }).catch((e: Error) => {
            assert.fail(`Failed to start rest server: ${e.message}`);
        });
    });

    after(() => {
        restServer.shutdown();
        cleanupUnitTest();
    });

    it('Test GET check-status', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/check-status`, (err: Error, res: request.Response) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(200);
            }
            done();
        });
    });

    it('Test GET trial-jobs/:id', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/trial-jobs/1234`, (err: Error, res: request.Response, body: any) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(200);
                expect(JSON.parse(body).trialJobId).to.equal('1234');
            }
            done();
        });
    });

    it('Test GET experiment', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/experiment`, (err: Error, res: request.Response) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(200);
            }
            done();
        });
    });

    it('Test GET trial-jobs', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/trial-jobs`, (err: Error, res: request.Response) => {
            expect(res.statusCode).to.equal(200);
            if (err) {
                assert.fail(err.message);
            }
            done();
        });
    });

    it('Test GET experiments-info', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/experiments-info`, (err: Error, res: request.Response) => {
            expect(res.statusCode).to.equal(200);
            if (err) {
                assert.fail(err.message);
            }
            done();
        });
    });

    it('Test change concurrent-trial-jobs', (done: Mocha.Done) => {
        request.get(`${ROOT_URL}/experiment`, (err: Error, res: request.Response, body: any) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(200);
                const profile: ExperimentProfile = JSON.parse(body);
                if (profile.params && profile.params.trialConcurrency) {
                    profile.params.trialConcurrency = 10;
                }

                const req: request.Options = {
                    uri: `${ROOT_URL}/experiment?update_type=TRIAL_CONCURRENCY`,
                    method: 'PUT',
                    json: true,
                    body: profile
                };
                request(req, (error: Error, response: request.Response) => {
                    if (error) {
                        assert.fail(error.message);
                    } else {
                        expect(response.statusCode).to.equal(200);
                    }
                    done();
                });
            }
        });
    });

    /* FIXME
    it('Test PUT experiment/cluster-metadata bad key', (done: Mocha.Done) => {
        const req: request.Options = {
            uri: `${ROOT_URL}/experiment/cluster-metadata`,
            method: 'PUT',
            json: true,
            body: {
                exception_test_key: 'test'
            }
        };
        request(req, (err: Error, res: request.Response) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(400);
            }
            done();
        });
    });
    */

    /* FIXME
    it('Test PUT experiment/cluster-metadata', (done: Mocha.Done) => {
        const req: request.Options = {
            uri: `${ROOT_URL}/experiment/cluster-metadata`,
            method: 'PUT',
            json: true,
            body: {
                machine_list: [{
                    ip: '10.10.10.101',
                    port: 22,
                    username: 'test',
                    passwd: '1234'
                }, {
                    ip: '10.10.10.102',
                    port: 22,
                    username: 'test',
                    passwd: '1234'
                }]
            }
        };
        request(req, (err: Error, res: request.Response) => {
            if (err) {
                assert.fail(err.message);
            } else {
                expect(res.statusCode).to.equal(200);
            }
            done();
        });
    });
    */
});
