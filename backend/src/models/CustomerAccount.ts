import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface CustomerAccountAttributes {
  id: string;
  customer_id: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  priority: number;
  verified: boolean;
  bvn_verified_at: Date | null;
  created_at: Date;
}

interface CustomerAccountCreationAttributes extends Optional<
  CustomerAccountAttributes,
  "id" | "verified" | "bvn_verified_at" | "created_at"
> {}

class CustomerAccount
  extends Model<CustomerAccountAttributes, CustomerAccountCreationAttributes>
  implements CustomerAccountAttributes
{
  public id!: string;
  public customer_id!: string;
  public account_number!: string;
  public bank_code!: string;
  public bank_name!: string;
  public account_name!: string;
  public priority!: number;
  public verified!: boolean;
  public bvn_verified_at!: Date | null;
  public created_at!: Date;
}

CustomerAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
    },
    account_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        len: [10, 10],
      },
    },
    bank_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    account_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    bvn_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "customer_accounts",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["customer_id", "account_number"],
      },
    ],
  },
);

export default CustomerAccount;
