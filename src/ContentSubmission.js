import React, { useEffect, useState } from 'react';
import { Grid, Form, Dropdown, Input, Label } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import {
  TxButton,
  TxGroupButton,
  TxGroupButtonSingular
} from './substrate-lib/components';

const argIsOptional = arg => arg.type.toString().startsWith('Option<');

function Main (props) {
  const { api, jsonrpc } = useSubstrate();
  const { accountPair } = props;
  const [status, setStatus] = useState(null);

  const [interxType, setInterxType] = useState('EXTRINSIC');
  const [palletRPCs, setPalletRPCs] = useState([]);
  const [callables, setCallables] = useState([]);
  const [paramFields, setParamFields] = useState([]);

  const initFormState = {
    palletRpc: 'publicaFides',
    callable: 'storeContent',
    inputParams: []
  };

  const [formState, setFormState] = useState(initFormState);
  const { palletRpc, callable, inputParams } = formState;

  const getApiType = (api, interxType) => {
    if (interxType === 'QUERY') {
      return api.query;
    } else if (interxType === 'EXTRINSIC') {
      return api.tx;
    } else if (interxType === 'RPC') {
      return api.rpc;
    } else {
      return api.consts;
    }
  };

  const updatePalletRPCs = () => {
    if (!api) {
      return;
    }
    const apiType = getApiType(api, interxType);
    const palletRPCs = Object.keys(apiType)
      .sort()
      .filter(pr => Object.keys(apiType[pr]).length > 0)
      .map(pr => ({ key: pr, value: pr, text: pr }));
    setPalletRPCs(palletRPCs);
  };

  const updateCallables = () => {
    if (!api || palletRpc === '') {
      return;
    }
    const callables = Object.keys(getApiType(api, interxType)[palletRpc])
      .sort()
      .map(c => ({ key: c, value: c, text: c }));
    setCallables(callables);
  };

  const updateParamFields = () => {
    if (!api || palletRpc === '' || callable === '') {
      setParamFields([]);
      return;
    }

    let paramFields = [];

    if (interxType === 'QUERY') {
      const metaType = api.query[palletRpc][callable].meta.type;
      if (metaType.isPlain) {
        // Do nothing as `paramFields` is already set to []
      } else if (metaType.isMap) {
        paramFields = [
          {
            name: metaType.asMap.key.toString(),
            type: metaType.asMap.key.toString(),
            optional: false
          }
        ];
      } else if (metaType.isDoubleMap) {
        paramFields = [
          {
            name: metaType.asDoubleMap.key1.toString(),
            type: metaType.asDoubleMap.key1.toString(),
            optional: false
          },
          {
            name: metaType.asDoubleMap.key2.toString(),
            type: metaType.asDoubleMap.key2.toString(),
            optional: false
          }
        ];
      }
    } else if (interxType === 'EXTRINSIC') {
      const metaArgs = api.tx[palletRpc][callable].meta.args;

      if (metaArgs && metaArgs.length > 0) {
        paramFields = metaArgs.map(arg => ({
          name: arg.name.toString(),
          type: arg.type.toString(),
          optional: argIsOptional(arg)
        }));
      }
    } else if (interxType === 'RPC') {
      let metaParam = [];

      if (jsonrpc[palletRpc] && jsonrpc[palletRpc][callable]) {
        metaParam = jsonrpc[palletRpc][callable].params;
      }

      if (metaParam.length > 0) {
        paramFields = metaParam.map(arg => ({
          name: arg.name,
          type: arg.type,
          optional: arg.isOptional || false
        }));
      }
    } else if (interxType === 'CONSTANT') {
      paramFields = [];
    }

    setParamFields(paramFields);
  };

  useEffect(updatePalletRPCs, [api, interxType]);
  useEffect(updateCallables, [api, interxType, palletRpc]);
  useEffect(updateParamFields, [api, interxType, palletRpc, callable, jsonrpc]);

  const onPalletCallableParamChange = (_, data) => {
    setFormState(formState => {
      let res;
      const { state, value } = data;
      if (typeof state === 'object') {
        // Input parameter updated
        const {
          ind,
          paramField: { type }
        } = state;
        const inputParams = [...formState.inputParams];
        inputParams[ind] = { type, value };
        res = { ...formState, inputParams };
      } else if (state === 'palletRpc') {
        res = { ...formState, [state]: value, callable: '', inputParams: [] };
      } else if (state === 'callable') {
        res = { ...formState, [state]: value, inputParams: [] };
      }
      return res;
    });
  };

  const onInterxTypeChange = (ev, data) => {
    setInterxType(data.value);
    // clear the formState
    setFormState(initFormState);
  };

  const getOptionalMsg = interxType =>
    interxType === 'RPC'
      ? 'Optional Parameter'
      : 'Leaving this field as blank will submit a NONE value';

  return (
    <Grid.Column width={8}>
      <h1>Content Submission</h1>
      <h3>
        If you'd like to submit a piece of content to be processed by the
        system, please enter the url of the content below
      </h3>

      <Form>
        {paramFields.map((paramField, ind) => (
          <Form.Field key={`${paramField.name}-${paramField.type}`}>
            <Input
              placeholder={paramField.type}
              fluid
              type="text"
              label={paramField.name}
              state={{ ind, paramField }}
              value={inputParams[ind] ? inputParams[ind].value : ''}
              onChange={onPalletCallableParamChange}
            />
            {paramField.optional
              ? (
              <Label
                basic
                pointing
                color="teal"
                content={getOptionalMsg(interxType)}
              />
                )
              : null}
          </Form.Field>
        ))}
        <Form.Field style={{ textAlign: 'center' }}>
          <InteractorSubmit
            accountPair={accountPair}
            setStatus={setStatus}
            attrs={{
              interxType,
              palletRpc,
              callable,
              inputParams,
              paramFields
            }}
          />
        </Form.Field>
        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
      </Form>
    </Grid.Column>
  );
}

function InteractorSubmit (props) {
  return <TxGroupButtonSingular {...props} label="Submit Content Url" />;
}

export default function ContentSubmission (props) {
  const { api } = useSubstrate();
  return api.tx ? <Main {...props} /> : null;
}
