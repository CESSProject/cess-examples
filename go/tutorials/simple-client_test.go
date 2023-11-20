/*
	Copyright (C) CESS. All rights reserved.
	Copyright (C) Cumulus Encrypted Storage System. All rights reserved.

	SPDX-License-Identifier: Apache-2.0
*/

package tutorial_simple_client_test

import (
	// go std libs
	"context"
	"log"
	"os"
	"strings"
	"testing"
	"time"

	// 3rd-party libs
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"

	// CESS libs
	cess "github.com/CESSProject/cess-go-sdk"
	cessConfig "github.com/CESSProject/cess-go-sdk/config"
	cessUtils "github.com/CESSProject/cess-go-sdk/core/utils"
	p2pgo "github.com/CESSProject/p2p-go"
	// "github.com/libp2p/go-libp2p/core/peer"
	// ma "github.com/multiformats/go-multiaddr"
)

const DEFAULT_WAIT_TIME = time.Second * 15
const P2P_PORT = 4001

func TestMain(m *testing.M) {
	godotenv.Load("../.env.testnet")
	os.Exit(m.Run())
}

func TestSimpleClient(t *testing.T) {
	_, err := cess.New(
		cessConfig.CharacterName_Client,
		cess.ConnectRpcAddrs(strings.Split(os.Getenv("RPC_ADDRS"), " ")),
		cess.Mnemonic(os.Getenv("MY_MNEMONIC")),
		cess.TransactionTimeout(time.Duration(DEFAULT_WAIT_TIME)),
	)

	assert.NoError(t, err)
}

func TestDeOSS(t *testing.T) {
	conn, err := cess.New(
		cessConfig.CharacterName_Deoss,
		cess.ConnectRpcAddrs(strings.Split(os.Getenv("RPC_ADDRS"), " ")),
		cess.Mnemonic(os.Getenv("MY_MNEMONIC")),
		cess.TransactionTimeout(time.Duration(DEFAULT_WAIT_TIME)),
	)
	assert.NoError(t, err)

	bootnodes := make([]string, 0)

	for _, node := range strings.Split(os.Getenv("BOOTSTRAP_NODES"), " ") {
		addrs, err := cessUtils.ParseMultiaddrs(node)
		if err != nil {
			continue
		}
		bootnodes = append(bootnodes, addrs...)
	}

	p2p, err := p2pgo.New(
		context.Background(),
		p2pgo.ListenPort(P2P_PORT),
		p2pgo.Workspace("../workspace"),
		p2pgo.BootPeers(bootnodes),
	)
	assert.NoError(t, err)

	log.Printf("node addr: %v. ID: %v", p2p.Addrs(), p2p.ID())

	txHash, _, err := conn.Register(conn.GetRoleName(), p2p.GetPeerPublickey(), "", 0)
	if err != nil {
		log.Printf("Connection register() failed: %v", err.Error())
	}

	log.Printf("txHash: %+v\n", txHash)

	segmentInfo, rootHash, err := conn.ProcessingData("../assets/cess-go-sdk-readme.pdf")
	assert.NoError(t, err)

	log.Printf("segmentInfo: %+v\nrootHash: %+v\n", segmentInfo, rootHash)

	owner := []byte(os.Getenv("MY_ADDR"))
	owner2, err := cessUtils.ParsingPublickey(os.Getenv("MY_ADDR"))
	if err != nil {
		log.Fatal(err)
	}

	fileName := "cess-go-sdk-readme.pdf"
	bucketName := "test1"
	fileSize := uint64(1000)

	ownerByteStr, _ := cessUtils.NumsToByteStrDefault(owner)
	owner2ByteStr, _ := cessUtils.NumsToByteStrDefault(owner2)
	log.Printf("owner: %+v\n", ownerByteStr)
	log.Printf("owner2: %+v\n", owner2ByteStr)

	res, err := conn.GenerateStorageOrder(rootHash, segmentInfo, owner2, fileName, bucketName, fileSize)

	log.Printf("res: %+v\n\n", res)
	log.Printf("err: %+v\n\n", err)
}
