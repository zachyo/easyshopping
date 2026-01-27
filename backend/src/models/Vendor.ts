import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface VendorAttributes {
  id: string;
  user_id: string;
  business_name: string;
  business_category: string;
  settlement_account_number: string;
  settlement_bank_code: string;
  approval_status: "pending" | "approved" | "rejected";
  approved_at: Date | null;
  created_at: Date;
}

interface VendorCreationAttributes extends Optional<
  VendorAttributes,
  "id" | "approved_at" | "created_at"
> {}

class Vendor
  extends Model<VendorAttributes, VendorCreationAttributes>
  implements VendorAttributes
{
  public id!: string;
  public user_id!: string;
  public business_name!: string;
  public business_category!: string;
  public settlement_account_number!: string;
  public settlement_bank_code!: string;
  public approval_status!: "pending" | "approved" | "rejected";
  public approved_at!: Date | null;
  public created_at!: Date;
}

Vendor.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    business_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    business_category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    settlement_account_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    settlement_bank_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    approved_at: {
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
    tableName: "vendors",
    timestamps: false,
  },
);

export default Vendor;
