using System;
using System.Collections;

//Q. What is the difference between Arraylist and Hashtable?
namespace What_is_the_difference_between_Arraylist_and_Hashtable
{
    class Program
    {
        static void Main(string[] args)
        {
            // ArrayList - ArrayList can only add items or values in it.
            
            ArrayList arrList = new ArrayList();
            
            arrList.Add(7896);
            
            arrList.Add("Happy");


            // Hashtable - Hashtable add items with keys in it.
            
            Hashtable hashTable = new Hashtable();
            
            hashTable.Add("Number", 1);
            
            hashTable.Add("Car", "Ferrari");

        }
    }
}
