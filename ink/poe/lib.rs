#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod contract {
	use ink::prelude::{vec, vec::Vec};
	use ink::storage::Mapping;

	#[ink(storage)]
	pub struct Contract {
		/// Mapping from AccountId to hash of files the user owned
		users: Mapping<AccountId, Vec<Hash>>,
		/// Mapping from the file hash to its owner
		files: Mapping<Hash, AccountId>,
	}

	#[ink(event)]
	pub struct Claimed {
		#[ink(topic)]
		owner: AccountId,
		#[ink(topic)]
		file: Hash,
	}

	#[ink(event)]
	pub struct Forfeited {
		#[ink(topic)]
		owner: AccountId,
		#[ink(topic)]
		file: Hash,
	}

	#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
	#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
	pub enum Error {
		/// File with the specified hash has been claimed by another user
		AlreadyClaimed,
		/// Caller doesn't own the file with the specified hash
		NotOwner,
	}

	// Result type
	pub type Result<T> = core::result::Result<T, Error>;

	impl Default for Contract {
        fn default() -> Self {
            Self::new()
        }
    }

	impl Contract {
		/// Constructor to initialize the contract
		#[ink(constructor)]
		pub fn new() -> Self {
			let users = Mapping::default();
			let files = Mapping::default();
			Self { users, files }
		}

		#[ink(message)]
		pub fn owned_files(&self) -> Vec<Hash> {
			let from = self.env().caller();
			self.users.get(from).unwrap_or_default()
		}

		#[ink(message)]
		pub fn has_claimed(&self, file: Hash) -> bool {
			self.files.get(file).is_some()
		}

		/// A message to claim the ownership of the file hash
		#[ink(message)]
		pub fn claim(&mut self, file: Hash) -> Result<()> {
			let from = self.env().caller();

			// Check the hash hasn't been claimed yet
			if self.files.contains(file) {
				return Err(Error::AlreadyClaimed);
			}

			// Claim the file hash ownership with two write ops
			match self.users.get(from) {
				Some(mut files) => {
					// A user entry has already been built
					files.push(file);
					self.users.insert(from, &files);
				}
				None => {
					// A user entry hasn't been built, so building one here
					self.users.insert(from, &vec![file]);
				}
			}
			self.files.insert(file, &from);

			// Emit an event
			Self::env().emit_event(Claimed { owner: from, file });

			Ok(())
		}

		#[ink(message)]
		pub fn forfeit(&mut self, file: Hash) -> Result<()> {
			let from = self.env().caller();

			// Check if the file is owned by the caller
			match self.files.get(file) {
				Some(owner) => {
					if owner != from {
						return Err(Error::NotOwner);
					}
				}
				None => {
					return Err(Error::NotOwner);
				}
			}

			// Confirmed the caller is the file owner. Update the two storage
			let mut files = self.users.get(from).unwrap_or_default();
			for idx in 0..files.len() {
				if files[idx] == file {
					files.swap_remove(idx);
					self.users.insert(from, &files);
				}
			}

			self.files.remove(file);

			// Emit an event
			Self::env().emit_event(Forfeited { owner: from, file });

			Ok(())
		}
	}

	/// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
	/// module and test functions are marked with a `#[test]` attribute.
	/// The below code is technically just normal Rust code.
	#[cfg(test)]
	mod tests {
		/// Imports all the definitions from the outer scope so we can use them here.
		use super::*;
		use ink::env::{
			hash::{Blake2x256, HashOutput},
			hash_bytes, test, DefaultEnvironment,
		};
		use scale::Decode;

		type Event = <Contract as ink::reflect::ContractEventBase>::Type;

		fn assert_ttl_events(num: u64) {
			let emitted_events = test::recorded_events().collect::<Vec<_>>();
			assert_eq!(emitted_events.len(), num as usize);
		}

		fn assert_claim_event_exists(expected_owner: AccountId, expected_hash: Hash) {
			let emitted_events = test::recorded_events().collect::<Vec<_>>();
			let mut ev_exists = false;

			// Loop thru the event loop
			for idx in 0..emitted_events.len() {
				let decoded_ev = <Event as Decode>::decode(&mut &emitted_events[idx].data[..])
					.expect("invalid contract event data buffer");
				if let Event::Claimed(Claimed { owner, file }) = decoded_ev {
					if owner == expected_owner && file == expected_hash {
						ev_exists = true;
					}
				}
			}

			assert_eq!(ev_exists, true, "claim event doesn't exist");
		}

		fn assert_forfeit_event_exists(expected_owner: AccountId, expected_hash: Hash) {
			let emitted_events = test::recorded_events().collect::<Vec<_>>();
			let mut ev_exists = false;

			// Loop thru the event loop
			for idx in 0..emitted_events.len() {
				let decoded_ev = <Event as Decode>::decode(&mut &emitted_events[idx].data[..])
					.expect("invalid contract event data buffer");
				if let Event::Forfeited(Forfeited { owner, file }) = decoded_ev {
					if owner == expected_owner && file == expected_hash {
						ev_exists = true;
					}
				}
			}

			assert_eq!(ev_exists, true, "claim event doesn't exist");
		}

		/// We test a simple use case of our contract.`
		#[ink::test]
		fn claim_file_works() {
			let mut contract = Contract::new();
			let accts = test::default_accounts::<DefaultEnvironment>();

			let file_content: Vec<u8> = vec![13, 14, 15];
			let mut hash = <Blake2x256 as HashOutput>::Type::default();
			hash_bytes::<Blake2x256>(&file_content, &mut hash);

			// Print output with the following, run with `cargo test -- --nocapture`
			// ink::env::debug_println!("hash: {:?}", hash);

			// Test initialized conditions
			test::set_caller::<DefaultEnvironment>(accts.alice);
			assert_eq!(contract.has_claimed(hash.clone().into()), false);
			assert_eq!(contract.owned_files().len(), 0);

			// Claim the file
			let _ = contract.claim(hash.clone().into());

			// Test the storage/state
			// The hash of the file should have been claimed
			assert_eq!(contract.has_claimed(hash.clone().into()), true);
			// The owner should now own one file
			assert_eq!(contract.owned_files().len(), 1);

			// Test an event is emitted
			assert_ttl_events(1);
			assert_claim_event_exists(accts.alice, hash.clone().into());

			// Claim the same file again. Now it should return an error
			assert_eq!(
				contract.claim(hash.clone().into()),
				Err(Error::AlreadyClaimed)
			);
		}

		#[ink::test]
		fn claim_two_files_works() {
			let mut contract = Contract::new();
			let accts = test::default_accounts::<DefaultEnvironment>();

			let file_content1: Vec<u8> = vec![13, 14, 15];
			let mut hash1 = <Blake2x256 as HashOutput>::Type::default();
			hash_bytes::<Blake2x256>(&file_content1, &mut hash1);

			let file_content2: Vec<u8> = vec![16, 17, 18];
			let mut hash2 = <Blake2x256 as HashOutput>::Type::default();
			hash_bytes::<Blake2x256>(&file_content2, &mut hash2);

			// Claim the two files
			test::set_caller::<DefaultEnvironment>(accts.bob);
			let _ = contract.claim(hash1.clone().into());
			let _ = contract.claim(hash2.clone().into());

			// Test the storage/state
			// The hash of the file should have been claimed
			assert_eq!(contract.has_claimed(hash1.clone().into()), true);
			assert_eq!(contract.has_claimed(hash2.clone().into()), true);
			// The owner should now own two files
			assert_eq!(contract.owned_files().len(), 2);

			// Test emitted events
			assert_ttl_events(2);
			assert_claim_event_exists(accts.bob, hash1.into());
			assert_claim_event_exists(accts.bob, hash2.into());
		}

		#[ink::test]
		fn forfeit_file_works() {
			let mut contract = Contract::new();
			let accts = test::default_accounts::<DefaultEnvironment>();

			let file_content: Vec<u8> = vec![13, 14, 15];
			let mut hash = <Blake2x256 as HashOutput>::Type::default();
			hash_bytes::<Blake2x256>(&file_content, &mut hash);

			// Test initialized conditions
			test::set_caller::<DefaultEnvironment>(accts.alice);

			assert_eq!(contract.forfeit(hash.clone().into()), Err(Error::NotOwner));

			let _ = contract.claim(hash.clone().into());

			// Test that Bob cannot forfeit the ownership
			test::set_caller::<DefaultEnvironment>(accts.bob);
			assert_eq!(contract.forfeit(hash.clone().into()), Err(Error::NotOwner));

			// Return back to Alice
			test::set_caller::<DefaultEnvironment>(accts.alice);
			let _ = contract.forfeit(hash.clone().into());

			// Test the storage/state
			// The hash of the file should have been claimed
			assert_eq!(contract.has_claimed(hash.clone().into()), false);
			assert_eq!(contract.owned_files().len(), 0);

			// Test emitted events
			assert_ttl_events(2);
			assert_claim_event_exists(accts.alice, hash.into());
			assert_forfeit_event_exists(accts.alice, hash.into());
		}
	}
}
