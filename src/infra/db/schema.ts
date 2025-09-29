import {
  pgTable,
  varchar,
  bigint,
  integer,
  smallint,
  boolean,
  timestamp,
  pgEnum,
  json,
  index,
  serial,
  text
} from 'drizzle-orm/pg-core'

export type InferEnum<T extends { enumValues: string[] }> = T['enumValues'][number]

// ==================== ENUMS ====================

export const gameStatusEnum = pgEnum('game_status', ['WaitingForPlayers', 'InProgress', 'Finished'] as const)

export const tradeStatusEnum = pgEnum('trade_status', [
  'Pending',
  'Accepted',
  'Rejected',
  'Cancelled',
  'Expired'
] as const)

export const colorGroupEnum = pgEnum('color_group', [
  'Brown',
  'LightBlue',
  'Pink',
  'Orange',
  'Red',
  'Yellow',
  'Green',
  'DarkBlue',
  'Railroad',
  'Utility',
  'Special'
] as const)

export const propertyTypeEnum = pgEnum('property_type', [
  'Property',
  'Street',
  'Railroad',
  'Utility',
  'Corner',
  'Chance',
  'CommunityChest',
  'Tax',
  'Beach',
  'Festival'
] as const)

export const buildingTypeEnum = pgEnum('building_type', ['House', 'Hotel'] as const)

export const tradeTypeEnum = pgEnum('trade_type', [
  'MoneyOnly',
  'PropertyOnly',
  'MoneyForProperty',
  'PropertyForMoney'
] as const)

// ==================== TABLES ====================

export const platformConfigs = pgTable(
  'platform_configs',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    id: varchar('id', { length: 44 }).notNull(),
    feeBasisPoints: smallint('fee_basis_points').notNull(),
    authority: varchar('authority', { length: 44 }).notNull(),
    feeVault: varchar('fee_vault', { length: 44 }).notNull(),
    totalGamesCreated: bigint('total_games_created', { mode: 'number' }).default(0),
    nextGameId: bigint('next_game_id', { mode: 'number' }).default(0),
    bump: smallint('bump').notNull(),

    // Metadata - consistent naming
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_platform_authority').on(table.authority),
    index('idx_platform_fee_vault').on(table.feeVault),
    index('idx_next_game_id').on(table.nextGameId)
  ]
)

// Games
export const games = pgTable(
  'games',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    gameId: bigint('game_id', { mode: 'number' }).notNull(),
    configId: varchar('config_id', { length: 44 }).notNull(),
    authority: varchar('authority', { length: 44 }).notNull(),
    bump: smallint('bump').notNull(),
    maxPlayers: smallint('max_players').notNull(),
    currentPlayers: smallint('current_players').default(0),
    currentTurn: smallint('current_turn').default(0),

    // Players array
    players: json('players').$type<string[]>().notNull(),

    // Business timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    gameStatus: gameStatusEnum('game_status').notNull(),

    // Financial
    bankBalance: bigint('bank_balance', { mode: 'number' }).default(0),
    freeParkingPool: bigint('free_parking_pool', { mode: 'number' }).default(0),

    // Property management
    housesRemaining: smallint('houses_remaining').default(32),
    hotelsRemaining: smallint('hotels_remaining').default(12),

    // Time controls
    timeLimit: bigint('time_limit', { mode: 'number' }),
    turnStartedAt: bigint('turn_started_at', { mode: 'number' }).notNull(),

    // Winner
    winner: varchar('winner', { length: 44 }),

    // Metadata - consistent naming
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_game_id').on(table.gameId),
    index('idx_game_config_id').on(table.configId),
    index('idx_game_authority').on(table.authority),
    index('idx_game_status').on(table.gameStatus),
    index('idx_current_turn').on(table.currentTurn),
    index('idx_game_winner').on(table.winner),
    index('idx_game_created_at').on(table.createdAt),
    index('idx_game_updated_at').on(table.accountUpdatedAt),
    index('idx_game_updated_slot').on(table.updatedSlot)
  ]
)

// Players
export const players = pgTable(
  'players',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    wallet: varchar('wallet', { length: 44 }).notNull(),
    game: varchar('game', { length: 44 }).notNull(),

    // Financial
    cashBalance: bigint('cash_balance', { mode: 'number' }).default(1500),
    netWorth: bigint('net_worth', { mode: 'number' }).default(1500),

    // Position & Status
    position: smallint('position').default(0),
    inJail: boolean('in_jail').default(false),
    jailTurns: smallint('jail_turns').default(0),
    doublesCount: smallint('doubles_count').default(0),
    isBankrupt: boolean('is_bankrupt').default(false),

    // Properties
    propertiesOwned: json('properties_owned').$type<number[]>().default([]),

    // Jail cards
    getOutOfJailCards: smallint('get_out_of_jail_cards').default(0),

    // Turn state
    hasRolledDice: boolean('has_rolled_dice').default(false),
    lastDiceRoll: json('last_dice_roll').$type<[number, number]>().default([0, 0]),

    // Timestamps
    lastRentCollected: bigint('last_rent_collected', { mode: 'number' }).notNull(),
    festivalBoostTurns: smallint('festival_boost_turns').default(0),
    cardDrawnAt: bigint('card_drawn_at', { mode: 'number' }),

    // Pending actions
    needsPropertyAction: boolean('needs_property_action').default(false),
    pendingPropertyPosition: smallint('pending_property_position'),
    needsChanceCard: boolean('needs_chance_card').default(false),
    needsCommunityChestCard: boolean('needs_community_chest_card').default(false),
    needsBankruptcyCheck: boolean('needs_bankruptcy_check').default(false),
    needsSpecialSpaceAction: boolean('needs_special_space_action').default(false),
    pendingSpecialSpacePosition: smallint('pending_special_space_position'),

    // Metadata
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_player_wallet').on(table.wallet),
    index('idx_player_game').on(table.game),
    index('idx_player_position').on(table.position),
    index('idx_player_in_jail').on(table.inJail),
    index('idx_player_cash_balance').on(table.cashBalance),
    index('idx_player_bankrupt').on(table.isBankrupt),
    index('idx_player_updated_at').on(table.accountUpdatedAt),
    index('idx_player_updated_slot').on(table.updatedSlot)
  ]
)

// Properties
export const properties = pgTable(
  'properties',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    position: smallint('position').notNull(),
    owner: varchar('owner', { length: 44 }),
    price: smallint('price').notNull(),
    colorGroup: colorGroupEnum('color_group').notNull(),
    propertyType: propertyTypeEnum('property_type').notNull(),
    houses: smallint('houses').default(0),
    hasHotel: boolean('has_hotel').default(false),
    isMortgaged: boolean('is_mortgaged').default(false),

    // Rent information
    rentBase: smallint('rent_base').notNull(),
    rentWithColorGroup: smallint('rent_with_color_group').notNull(),
    rentWithHouses: json('rent_with_houses').$type<[number, number, number, number]>().notNull(),
    rentWithHotel: smallint('rent_with_hotel').notNull(),
    houseCost: smallint('house_cost').notNull(),
    mortgageValue: smallint('mortgage_value').notNull(),

    // Timestamp
    lastRentPaid: bigint('last_rent_paid', { mode: 'number' }).notNull(),

    // Metadata
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_property_position').on(table.position),
    index('idx_property_owner').on(table.owner),
    index('idx_property_color_group').on(table.colorGroup),
    index('idx_property_type').on(table.propertyType),
    index('idx_property_mortgaged').on(table.isMortgaged),
    index('idx_property_updated_at').on(table.accountUpdatedAt),
    index('idx_property_updated_slot').on(table.updatedSlot)
  ]
)

// Trades
export const trades = pgTable(
  'trades',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    game: varchar('game', { length: 44 }).notNull(),
    proposer: varchar('proposer', { length: 44 }).notNull(),
    receiver: varchar('receiver', { length: 44 }).notNull(),
    tradeType: tradeTypeEnum('trade_type').notNull(),

    // Money amounts
    proposerMoney: bigint('proposer_money', { mode: 'number' }).default(0),
    receiverMoney: bigint('receiver_money', { mode: 'number' }).default(0),

    // Properties (single property per trade)
    proposerProperty: smallint('proposer_property'),
    receiverProperty: smallint('receiver_property'),

    // Status and timing
    status: tradeStatusEnum('status').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
    bump: smallint('bump').notNull(),

    // Metadata
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_trade_game').on(table.game),
    index('idx_trade_proposer').on(table.proposer),
    index('idx_trade_receiver').on(table.receiver),
    index('idx_trade_status').on(table.status),
    index('idx_trade_expires_at').on(table.expiresAt),
    index('idx_trade_updated_at').on(table.accountUpdatedAt),
    index('idx_trade_updated_slot').on(table.updatedSlot)
  ]
)

// Auctions
export const auctions = pgTable(
  'auctions',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    game: varchar('game', { length: 44 }).notNull(),
    propertyPosition: smallint('property_position').notNull(),
    currentBid: bigint('current_bid', { mode: 'number' }).default(0),
    highestBidder: varchar('highest_bidder', { length: 44 }),
    startedAt: bigint('started_at', { mode: 'number' }).notNull(),
    endsAt: bigint('ends_at', { mode: 'number' }).notNull(),
    isActive: boolean('is_active').default(true),
    bump: smallint('bump').notNull(),

    // Metadata
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_auction_game').on(table.game),
    index('idx_auction_property').on(table.propertyPosition),
    index('idx_auction_bidder').on(table.highestBidder),
    index('idx_auction_active').on(table.isActive),
    index('idx_auction_ends_at').on(table.endsAt),
    index('idx_auction_updated_at').on(table.accountUpdatedAt),
    index('idx_auction_updated_slot').on(table.updatedSlot)
  ]
)

// ==================== EVENT TABLES ====================

// Chance Card Events
export const chanceCardEvents = pgTable(
  'chance_card_events',
  {
    id: varchar('id', { length: 88 }).primaryKey(),
    player: varchar('player', { length: 44 }).notNull(),
    game: varchar('game', { length: 44 }).notNull(),
    cardIndex: smallint('card_index').notNull(),
    effectType: smallint('effect_type').notNull(),
    amount: integer('amount').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('idx_chance_player').on(table.player),
    index('idx_chance_game').on(table.game),
    index('idx_chance_timestamp').on(table.timestamp),
    index('idx_chance_created_at').on(table.createdAt)
  ]
)

// Community Chest Card Events
export const communityChestCardEvents = pgTable(
  'community_chest_card_events',
  {
    id: varchar('id', { length: 88 }).primaryKey(),
    player: varchar('player', { length: 44 }).notNull(),
    game: varchar('game', { length: 44 }).notNull(),
    cardIndex: smallint('card_index').notNull(),
    effectType: smallint('effect_type').notNull(),
    amount: integer('amount').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('idx_community_player').on(table.player),
    index('idx_community_game').on(table.game),
    index('idx_community_timestamp').on(table.timestamp),
    index('idx_community_created_at').on(table.createdAt)
  ]
)

// Player Passed Go Events
export const playerPassedGoEvents = pgTable(
  'player_passed_go_events',
  {
    id: varchar('id', { length: 88 }).primaryKey(),
    player: varchar('player', { length: 44 }).notNull(),
    game: varchar('game', { length: 44 }).notNull(),
    salaryCollected: bigint('salary_collected', { mode: 'number' }).notNull(),
    newPosition: smallint('new_position').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('idx_passed_go_player').on(table.player),
    index('idx_passed_go_game').on(table.game),
    index('idx_passed_go_timestamp').on(table.timestamp),
    index('idx_passed_go_created_at').on(table.createdAt)
  ]
)

// ==================== INFRASTRUCTURE TABLES ====================

// Processing Queue - Essential for async processing
export const processingQueue = pgTable(
  'processing_queue',
  {
    id: serial('id').primaryKey(),
    accountPubkey: varchar('account_pubkey', { length: 44 }).notNull(),
    accountType: varchar('account_type', { length: 30 }).notNull(),
    accountData: json('account_data').notNull(),
    eventType: varchar('event_type', { length: 20 }).notNull(), // 'create' | 'update' | 'close'
    slot: bigint('slot', { mode: 'number' }).notNull(),
    signature: varchar('signature', { length: 88 }),
    status: varchar('status', { length: 20 }).default('pending'),
    retryCount: integer('retry_count').default(0),
    maxRetries: integer('max_retries').default(3),
    errorMessage: text('error_message'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true })
  },
  (table) => [
    index('idx_processing_status_created').on(table.status, table.createdAt),
    index('idx_processing_account_pubkey').on(table.accountPubkey),
    index('idx_processing_slot').on(table.slot),
    index('idx_processing_event_type').on(table.eventType)
  ]
)

// Sync Status
export const syncComponentEnum = pgEnum('sync_component', [
  'historical_sync',
  'account_listener',
  'queue_processor',
  'live_sync',
  'gap_recovery'
] as const)

export type SyncComponent = InferEnum<typeof syncComponentEnum>

export const syncStatusEnum = pgEnum('sync_status_type', ['running', 'stopped', 'completed', 'failed'] as const)

export type SyncStatus = InferEnum<typeof syncStatusEnum>

export const syncStatus = pgTable(
  'sync_status',
  {
    id: serial('id').primaryKey(),
    component: syncComponentEnum('component').notNull().unique(),
    lastProcessedSlot: bigint('last_processed_slot', { mode: 'number' }),
    lastProcessedSignature: varchar('last_processed_signature', { length: 88 }),
    lastProcessedTimestamp: bigint('last_processed_timestamp', { mode: 'number' }),
    accountsProcessed: integer('accounts_processed').default(0),
    status: syncStatusEnum('status').notNull(),
    errorMessage: text('error_message'),

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('idx_sync_component').on(table.component),
    index('idx_sync_status').on(table.status),
    index('idx_sync_updated_at').on(table.updatedAt)
  ]
)

// Integrator Configs
export const integratorConfigs = pgTable(
  'integrator_configs',
  {
    pubkey: varchar('pubkey', { length: 44 }).primaryKey(),
    integratorId: varchar('integrator_id', { length: 44 }).notNull(),
    integrator: varchar('integrator', { length: 44 }).notNull(),
    feeBasisPoints: smallint('fee_basis_points').notNull(),
    feeVault: varchar('fee_vault', { length: 44 }).notNull(),
    totalGamesCreated: bigint('total_games_created', { mode: 'number' }).default(0),
    activeGamesCount: integer('active_games_count').default(0),
    totalVolume: bigint('total_volume', { mode: 'number' }).default(0),
    platformFeesCollected: bigint('platform_fees_collected', { mode: 'number' }).default(0),
    nextGameId: bigint('next_game_id', { mode: 'number' }).default(0),
    bump: smallint('bump').notNull(),

    // Metadata
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }).defaultNow(),
    accountUpdatedAt: timestamp('account_updated_at', { withTimezone: true }).defaultNow(),
    createdSlot: bigint('created_slot', { mode: 'number' }).notNull(),
    updatedSlot: bigint('updated_slot', { mode: 'number' }).notNull(),
    lastSignature: varchar('last_signature', { length: 88 })
  },
  (table) => [
    index('idx_integrator_id').on(table.integratorId),
    index('idx_integrator').on(table.integrator),
    index('idx_integrator_total_games').on(table.totalGamesCreated),
    index('idx_integrator_active_games').on(table.activeGamesCount)
  ]
)

// Game Events
export const gameEvents = pgTable(
  'game_events',
  {
    id: varchar('id', { length: 88 }).primaryKey(),
    game: varchar('game', { length: 44 }).notNull(),
    player: varchar('player', { length: 44 }).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'dice_roll', 'property_purchase', 'trade', 'card_draw', etc.
    eventData: json('event_data').notNull(), // Flexible JSON structure for different event types
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Blockchain metadata
    slot: bigint('slot', { mode: 'number' }).notNull(),
    signature: varchar('signature', { length: 88 }),

    // Database metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('idx_game_event_game').on(table.game),
    index('idx_game_event_player').on(table.player),
    index('idx_game_event_type').on(table.eventType),
    index('idx_game_event_timestamp').on(table.timestamp),
    index('idx_game_event_slot').on(table.slot)
  ]
)

// ==================== TYPES ====================

export type GameStatus = InferEnum<typeof gameStatusEnum>
export type TradeStatus = InferEnum<typeof tradeStatusEnum>
export type ColorGroup = InferEnum<typeof colorGroupEnum>
export type PropertyType = InferEnum<typeof propertyTypeEnum>
export type BuildingType = InferEnum<typeof buildingTypeEnum>
export type TradeType = InferEnum<typeof tradeTypeEnum>

// Table Types
export type PlatformConfig = typeof platformConfigs.$inferSelect
export type NewPlatformConfig = typeof platformConfigs.$inferInsert

export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert

export type Player = typeof players.$inferSelect
export type NewPlayer = typeof players.$inferInsert

export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert

export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert

export type Auction = typeof auctions.$inferSelect
export type NewAuction = typeof auctions.$inferInsert

// Event Types
export type ChanceCardEvent = typeof chanceCardEvents.$inferSelect
export type NewChanceCardEvent = typeof chanceCardEvents.$inferInsert

export type CommunityChestCardEvent = typeof communityChestCardEvents.$inferSelect
export type NewCommunityChestCardEvent = typeof communityChestCardEvents.$inferInsert

export type PlayerPassedGoEvent = typeof playerPassedGoEvents.$inferSelect
export type NewPlayerPassedGoEvent = typeof playerPassedGoEvents.$inferInsert

// Infrastructure Types
export type ProcessingQueue = typeof processingQueue.$inferSelect
export type NewProcessingQueue = typeof processingQueue.$inferInsert

export type SyncStatusRecord = typeof syncStatus.$inferSelect
export type NewSyncStatus = typeof syncStatus.$inferInsert

export type IntegratorConfig = typeof integratorConfigs.$inferSelect
export type NewIntegratorConfig = typeof integratorConfigs.$inferInsert

export type GameEvent = typeof gameEvents.$inferSelect
export type NewGameEvent = typeof gameEvents.$inferInsert
