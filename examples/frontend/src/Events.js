import React, { useEffect, useState } from "react";
import { Feed, Grid, Button, Label, Form } from "semantic-ui-react";

import { useSubstrateState } from "./substrate-lib";

// Events to be filtered out from the event feed
const FILTERED_EVENTS = ["system:ExtrinsicSuccess"];

const eventName = (ev) => `${ev.section}:${ev.method}`;
const eventParams = (ev) => JSON.stringify(ev.data);

function Main(props) {
  const { api } = useSubstrateState();
  const [eventFeed, setEventFeed] = useState([[], new Set()]);

  useEffect(() => {
    let unsub = null;

    const allEvents = async () => {
      unsub = await api.query.system.events(async (events) => {
        // get the current block number
        const blockNum = await api.derive.chain.bestNumber();
        const currBlockNum = blockNum.toNumber() + 1;

        const feed = events
          .map((record) => {
            // extract the phase, event and the event types
            const evHuman = record.event.toHuman();
            const evNameNBlock = `${eventName(evHuman)} (block: ${currBlockNum})`;
            const evParams = eventParams(evHuman);
            return { evNameNBlock, evParams };
          })
          .filter(({ evNameNBlock }) =>
            !FILTERED_EVENTS.some((toFilterE) =>
              evNameNBlock.startsWith(toFilterE),
            ),
          )
          .map(({ evNameNBlock, evParams }) => ({
            key: evNameNBlock,
            icon: "bell",
            summary: evNameNBlock,
            content: evParams,
          }));

        if (feed.length === 0) return;

        setEventFeed(([prevFeed, prevSet]) => {
          // Because React fires useEffect() twice in strict mode, we need to ensure the events
          // haven't been added to the event feed before.
          const prevFeedSet = Array.from(prevSet);
          let filteredFeed = feed.filter(
            (oneFeed) =>
              !prevFeedSet.some((prevOneFeed) =>
                prevOneFeed.endsWith(oneFeed.key),
              ),
          );
          if (filteredFeed.length === 0) return [prevFeed, prevSet];

          // Adding a sequence number back to the event key
          filteredFeed = filteredFeed.map(
            ({ key, icon, summary, content }, idx) => ({
              key: `${prevSet.size + idx} - ${key}`,
              icon,
              summary,
              content,
            }),
          );

          // Construct the newSet
          const newSet = new Set(prevSet);
          filteredFeed.forEach((oneFeed) => newSet.add(oneFeed.key));
          return [[...filteredFeed, ...prevFeed], newSet];
        });
      });
    };

    // We only want to call the event subscription fn if it hasn't previously subscribed.
    !unsub && allEvents();

    return () => {
      unsub && unsub();
      unsub = null;
    };
  }, [api.derive.chain, api.query.system]);

  const { feedMaxHeight = 250 } = props;

  return (
    <Grid.Column width={8}>
      <h1>Events
        <Button
          basic
          circular
          size="mini"
          color="grey"
          floated="right"
          icon="erase"
          onClick={(_) => setEventFeed([[], new Set()])}
        />
      </h1>
      <Form>
        <Form.Field>
          <Label basic color="teal">
            Block number maybe off by 1
          </Label>
        </Form.Field>
      </Form>
      <Feed
        style={{ clear: "both", overflow: "auto", maxHeight: feedMaxHeight }}
        events={eventFeed[0]}
      />
    </Grid.Column>
  );
}

export default function Events(props) {
  const { api } = useSubstrateState();
  return api.query && api.query.system && api.query.system.events ? (
    <Main {...props} />
  ) : null;
}
