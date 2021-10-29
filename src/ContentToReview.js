import React, { useEffect, useState } from 'react'
import { Table, Grid, Button } from 'semantic-ui-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { web3FromSource } from '@polkadot/extension-dapp'

import { useSubstrate } from './substrate-lib'

export default function Main({ accountPair }) {
  const { api, keyring } = useSubstrate()

  const [contentToReview, setContentToReview] = useState()
  const [claimInputs, setClaimInputs] = useState()
  const [status, setStatus] = useState()

  const handleClaimInput = (contentId, value) =>
    setClaimInputs(claims => ({
      ...claims,
      ...{ [contentId]: value },
    }))

  const getFromAcct = async () => {
    const {
      address,
      meta: { source, isInjected },
    } = accountPair
    let fromAcct

    // signer is from Polkadot-js browser extension
    if (isInjected) {
      const injected = await web3FromSource(source)
      fromAcct = address
      api.setSigner(injected.signer)
    } else {
      fromAcct = accountPair
    }

    return fromAcct
  }

  const txResHandler = ({ status }) =>
    status.isFinalized
      ? setStatus(`😉 Finalized. Block hash: ${status.asFinalized.toString()}`)
      : setStatus(`Current transaction status: ${status.type}`)

  const txErrHandler = err => {
    console.log('your stuff failed.', err)
    setStatus(`😞 Transaction Failed: ${err.toString()}`)
  }

  const handleSubmitClaim = async contentId => {
    const objectiveClaimStatement = claimInputs[contentId]
    const contentIdNum = parseInt(contentId, 10)
    if (!objectiveClaimStatement) return

    const fromAcct = await getFromAcct()

    const proposal = api.tx.publicaFides.storeClaimForContent(
      objectiveClaimStatement,
      contentIdNum,
      // isAccepted: false to start.
      false
    )

    console.log('submitting claim', proposal)

    // committee is the first group of reviewers
    await api.tx.committee
      .propose(
        2,
        proposal,
        // long length bound for now.
        1000
      )
      .signAndSend(fromAcct, txResHandler)
      .catch(txErrHandler)

    // console.log('result?', unsub)

    // const tx = api.tx.publicaFides
  }

  useEffect(() => {
    // const addresses = keyring.getPairs().map(account => account.address)
    const unsubscribeAll = null
    api.query.publicaFides.contentStorage
      .entries()
      .then(val => {
        const newContent = val.map(thing => {
          return {
            // get data out of content
            ...thing[1].toHuman(),
            // get stringified id out of content
            ...{ id: thing[0].toHuman() },
          }
        })
        setContentToReview(newContent)
      })
      .catch(err => {
        console.log('er', err)
      })

    return () => unsubscribeAll && unsubscribeAll()
  }, [api, keyring, setContentToReview])

  return (
    <Grid.Column>
      <h1>Content To Review</h1>
      <h3>
        Members of the Content Reviewers can see this list. Members must go
        through any viewable content and come up with objective statements for
        any claims made in the article, or vote on existing ones. Their
        objective claim statements will be reviewed for objectivity by their
        peers, and for perceived truthfulness by another group.
      </h3>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>

      <Table celled striped size="small">
        <Table.Body>
          <Table.Row>
            <Table.Cell width={3} textAlign="right">
              <strong>id</strong>
            </Table.Cell>
            <Table.Cell width={10}>
              <strong>Url</strong>
            </Table.Cell>
            <Table.Cell width={3}>
              <strong>Add new Claim</strong>
            </Table.Cell>
          </Table.Row>
          {contentToReview &&
            contentToReview.map(content => (
              <Table.Row key={content.id}>
                <Table.Cell width={3} textAlign="right">
                  {content.id}
                </Table.Cell>
                <Table.Cell width={10}>
                  <span style={{ display: 'inline-block', minWidth: '31em' }}>
                    {content.url}
                  </span>
                </Table.Cell>
                <Table.Cell width={3}>
                  <input
                    type="text"
                    name="name"
                    onChange={e => handleClaimInput(content.id, e.target.value)}
                  />
                  <button onClick={() => handleSubmitClaim(content.id)}>
                    Submit
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table>
    </Grid.Column>
  )
}
