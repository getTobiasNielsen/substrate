import React, { useEffect, useState } from 'react'
import { Table, Grid, Button } from 'semantic-ui-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useSubstrate } from './substrate-lib'

export default function Main(props) {
  const { api, keyring } = useSubstrate()
  const accounts = keyring.getPairs()
  const [balances, setBalances] = useState({})
  const [proposalHashes, setProposalHashes] = useState()
  const [existingObjectiveClaimProposals, setExistingObjectiveClaimProposals] =
    useState()

  useEffect(() => {
    const addresses = keyring.getPairs().map(account => account.address)
    let unsubscribeAll = null

    api.query.system.account
      .multi(addresses, balances => {
        const balancesMap = addresses.reduce(
          (acc, address, index) => ({
            ...acc,
            [address]: balances[index].data.free.toHuman(),
          }),
          {}
        )
        setBalances(balancesMap)
      })
      .then(unsub => {
        unsubscribeAll = unsub
      })
      .catch(console.error)

    return () => unsubscribeAll && unsubscribeAll()
  }, [api, keyring, setBalances])

  // if (api?.query?.committee?.proposals) {
  api.query.committee
    .proposals()
    // first, get and set proposal hashes, those are needed to query the other storage items
    .then(myStuff => {
      const retrievedProposalHashes = myStuff.map(objectiveClaimSubmitted =>
        objectiveClaimSubmitted.toHuman()
      )
      setProposalHashes(retrievedProposalHashes)
    })
    .catch(console.error)
    .then()
  // }

  // api.query.committee.proposals
  //   // .entries()
  //   .then(stuff => console.log('stuff', stuff))
  //   .catch(console.error)

  // console.log(api.query.committee.proposalOf)
  // console.log(api.query.committee.voting)

  return (
    <Grid.Column>
      <h1>Objective Claims for Review</h1>
      <Table celled striped size="small">
        <Table.Body>
          <Table.Row>
            <Table.Cell width={3} textAlign="right">
              <strong>Name</strong>
            </Table.Cell>
            <Table.Cell width={10}>
              <strong>Address</strong>
            </Table.Cell>
            <Table.Cell width={3}>
              <strong>Balance</strong>
            </Table.Cell>
          </Table.Row>
          {accounts.map(account => (
            <Table.Row key={account.address}>
              <Table.Cell width={3} textAlign="right">
                {account.meta.name}
              </Table.Cell>
              <Table.Cell width={10}>
                <span style={{ display: 'inline-block', minWidth: '31em' }}>
                  {account.address}
                </span>
                <CopyToClipboard text={account.address}>
                  <Button
                    basic
                    circular
                    compact
                    size="mini"
                    color="blue"
                    icon="copy outline"
                  />
                </CopyToClipboard>
              </Table.Cell>
              <Table.Cell width={3}>
                {balances &&
                  balances[account.address] &&
                  balances[account.address]}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Grid.Column>
  )
}
